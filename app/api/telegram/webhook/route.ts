import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleRouteError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { answerCallbackQuery, editMessageText } from "@/lib/telegram";
import { sendPushToRole } from "@/lib/push";

type SosAzione = "eta_10" | "eta_30" | "annulla";

function parseCallbackData(data: string): { sosId: string; azione: SosAzione } | null {
  const parti = data.split(":");
  if (parti.length !== 3 || parti[0] !== "sos") return null;
  const sosId = parti[1];
  const azioneRaw = parti[2];
  if (
    !sosId ||
    (azioneRaw !== "eta_10" && azioneRaw !== "eta_30" && azioneRaw !== "annulla")
  ) {
    return null;
  }
  return { sosId, azione: azioneRaw };
}

export async function POST(request: NextRequest) {
  try {
    const secretRicevuto = request.headers.get("x-telegram-bot-api-secret-token");
    const secretAtteso = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!secretAtteso || secretRicevuto !== secretAtteso) {
      return NextResponse.json(
        { error: { code: "non_autenticato", message: "Secret token non valido." } },
        { status: 401 }
      );
    }

    const update = await request.json().catch(() => null);
    const callbackQuery = update?.callback_query;

    if (!callbackQuery) {
      // Aggiornamento non gestito (es. un messaggio testuale): ack e basta.
      return NextResponse.json({ ok: true });
    }

    const callbackData: string | undefined = callbackQuery.data;
    const chatId: string | undefined = callbackQuery.message?.chat?.id?.toString();
    const messageId: number | undefined = callbackQuery.message?.message_id;

    const parsedCallback = callbackData ? parseCallbackData(callbackData) : null;

    if (!parsedCallback) {
      await answerCallbackQuery(callbackQuery.id, "Azione non riconosciuta.");
      return NextResponse.json({ ok: true });
    }

    const { sosId, azione } = parsedCallback;
    const supabase = getSupabaseAdmin();

    const { data: sos, error: fetchError } = await supabase
      .from("sos_requests")
      .select("*")
      .eq("id", sosId)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);

    if (!sos || sos.stato !== "aperta") {
      await answerCallbackQuery(callbackQuery.id, "Questo SOS e' gia' stato gestito.");
      return NextResponse.json({ ok: true });
    }

    const now = new Date().toISOString();
    let testoAggiornato: string;
    let testoAck: string;

    if (azione === "annulla") {
      await supabase
        .from("sos_requests")
        .update({ stato: "conclusa", conclusa_at: now })
        .eq("id", sosId);
      testoAggiornato = "❌ Annullato";
      testoAck = "Segnato come annullato.";
    } else {
      const etaMinuti = azione === "eta_10" ? 10 : 30;
      await supabase
        .from("sos_requests")
        .update({ stato: "presa_in_carico", eta_minuti: etaMinuti, presa_in_carico_at: now })
        .eq("id", sosId);
      testoAggiornato = `✅ Presa in carico — arrivo tra ${etaMinuti} minuti`;
      testoAck = `Segnato: arrivo tra ${etaMinuti} minuti.`;

      await sendPushToRole("him", {
        title: "In arrivo",
        body: `Spuntino in arrivo tra ${etaMinuti} minuti.`,
      });
    }

    await answerCallbackQuery(callbackQuery.id, testoAck);

    if (chatId && messageId) {
      await editMessageText(chatId, messageId, testoAggiornato);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
