import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { eventCreateSchema, eventsQuerySchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

const SELECT_CON_ATTIVITA =
  "*, activity_types(slug, nome, emoji, durata_minuti, insieme)";

export async function GET(request: NextRequest) {
  try {
    // Il calendario e' condiviso: entrambi vedono tutti gli impegni.
    await requireSession();

    const parsed = eventsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { stato, da, a } = parsed.data;

    let query = getSupabaseAdmin()
      .from("events")
      .select(SELECT_CON_ATTIVITA)
      .order("inizio_at", { ascending: true });

    if (stato) query = query.eq("stato", stato);
    if (da) query = query.gte("inizio_at", da);
    if (a) query = query.lte("inizio_at", a);

    const { data, error } = await query;
    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ events: data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { role } = await requireSession();

    const body = await request.json().catch(() => null);
    const parsed = eventCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { activity_slug, inizio_at, nota } = parsed.data;

    const supabase = getSupabaseAdmin();

    const { data: activity, error: activityError } = await supabase
      .from("activity_types")
      .select("*")
      .eq("slug", activity_slug)
      .eq("attivo", true)
      .maybeSingle();

    if (activityError)
      throw new ApiError("errore_interno", activityError.message, 500);
    if (!activity) {
      return errorResponse("non_trovato", "Attivita' non trovata o non attiva.", 404);
    }

    const inizio = new Date(inizio_at);
    if (inizio.getTime() <= Date.now()) {
      return errorResponse(
        "input_non_valido",
        "Non puoi prenotare un orario nel passato.",
        400
      );
    }

    const fine = new Date(inizio.getTime() + activity.durata_minuti * 60 * 1000);

    // Un'attivita' insieme parte come invito da accettare; un impegno
    // personale finisce direttamente sul calendario condiviso.
    const stato = activity.insieme ? "in_attesa" : "confermato";

    const { data: evento, error: insertError } = await supabase
      .from("events")
      .insert({
        activity_type_id: activity.id,
        inizio_at: inizio.toISOString(),
        fine_at: fine.toISOString(),
        stato,
        creato_da: role,
        nota: nota ?? null,
      })
      .select(SELECT_CON_ATTIVITA)
      .single();

    if (insertError) {
      if (insertError.message?.includes("sovrapposizione")) {
        return errorResponse(
          "conflitto",
          "C'e' gia' un impegno che si sovrappone a questo orario.",
          409
        );
      }
      throw new ApiError("errore_interno", insertError.message, 500);
    }

    return NextResponse.json({ event: evento }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
