import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { sosCreateSchema } from "@/lib/schemas";
import { DEBOUNCE_MINUTI, LIVELLO_DESCRIZIONI } from "@/lib/sos";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatRomeDateTime } from "@/lib/time";
import { sendMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    // Solo lui chiama l'SOS.
    await requireRole("him");

    const body = await request.json().catch(() => null);
    const parsed = sosCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { livello, nota } = parsed.data;

    const supabase = getSupabaseAdmin();

    const sogliaDebounce = new Date(
      Date.now() - DEBOUNCE_MINUTI * 60 * 1000
    ).toISOString();

    const { data: sosRecente, error: recentError } = await supabase
      .from("sos_requests")
      .select("*")
      .in("stato", ["aperta", "presa_in_carico"])
      .gte("creato_at", sogliaDebounce)
      .order("creato_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentError) throw new ApiError("errore_interno", recentError.message, 500);

    if (sosRecente) {
      const minutiTrascorsi =
        (Date.now() - new Date(sosRecente.creato_at).getTime()) / 60000;
      const minutiRimanenti = Math.max(
        0,
        Math.ceil(DEBOUNCE_MINUTI - minutiTrascorsi)
      );

      return NextResponse.json(
        {
          error: {
            code: "conflitto",
            message: "Hai gia' mandato un SOS da poco, aspetta prima di rimandarne un altro.",
          },
          sos_esistente: sosRecente,
          minuti_rimanenti: minutiRimanenti,
        },
        { status: 409 }
      );
    }

    const { data: sos, error: insertError } = await supabase
      .from("sos_requests")
      .insert({ livello, nota: nota ?? null })
      .select("*")
      .single();

    if (insertError) throw new ApiError("errore_interno", insertError.message, 500);

    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (chatId) {
      const descrizione = LIVELLO_DESCRIZIONI[livello as 1 | 2 | 3];
      const testo = [
        `🚨 <b>SOS livello ${livello}</b> — ${descrizione}`,
        nota ? `Nota: ${nota}` : null,
        `Orario: ${formatRomeDateTime(sos.creato_at)}`,
      ]
        .filter(Boolean)
        .join("\n");

      const { messageId } = await sendMessage(chatId, testo, [
        { text: "10 min", callback_data: `sos:${sos.id}:eta_10` },
        { text: "30 min", callback_data: `sos:${sos.id}:eta_30` },
        { text: "Annulla", callback_data: `sos:${sos.id}:annulla` },
      ]);

      if (messageId) {
        await supabase
          .from("sos_requests")
          .update({ telegram_message_id: messageId })
          .eq("id", sos.id);
        sos.telegram_message_id = messageId;
      }
    } else {
      console.error("TELEGRAM_CHAT_ID non impostata: notifica saltata.");
    }

    return NextResponse.json({ sos }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
