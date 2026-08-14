import { NextRequest, NextResponse } from "next/server";
import { requireSession, type Role } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { partecipanti } from "@/lib/participants";
import { slotsQuerySchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";
import { romeLocalToUtc } from "@/lib/time";

const GRANULARITA_MINUTI = 15;
const FINESTRA_INIZIO_ORA = 7;
const FINESTRA_FINE_ORA = 23;

export async function GET(request: NextRequest) {
  try {
    const { role } = await requireSession();

    const parsed = slotsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { activity: activitySlug, giorno } = parsed.data;

    const supabase = getSupabaseAdmin();

    const { data: activity, error: activityError } = await supabase
      .from("activity_types")
      .select("*")
      .eq("slug", activitySlug)
      .eq("attivo", true)
      .maybeSingle();

    if (activityError)
      throw new ApiError("errore_interno", activityError.message, 500);
    if (!activity) {
      return errorResponse("non_trovato", "Attivita' non trovata o non attiva.", 404);
    }

    const finestraInizio = romeLocalToUtc(giorno, FINESTRA_INIZIO_ORA, 0);
    const finestraFine = romeLocalToUtc(giorno, FINESTRA_FINE_ORA, 0);
    const durataMs = activity.durata_minuti * 60 * 1000;

    // Chi verrebbe impegnato prenotando questa attivita'.
    const partecipantiNuovo = partecipanti(activity.insieme, role);

    const { data: eventiEsistenti, error: eventsError } = await supabase
      .from("events")
      .select("inizio_at, fine_at, creato_da, activity_types(insieme)")
      .in("stato", ["in_attesa", "confermato"])
      .lt("inizio_at", finestraFine.toISOString())
      .gt("fine_at", finestraInizio.toISOString());

    if (eventsError) throw new ApiError("errore_interno", eventsError.message, 500);

    // Tiene solo gli impegni che toccano almeno una delle persone coinvolte:
    // due impegni personali di persone diverse possono convivere.
    const occupati = (eventiEsistenti ?? [])
      .filter((e) => {
        const att = e.activity_types as unknown as { insieme: boolean } | null;
        const suoi = partecipanti(att?.insieme ?? false, e.creato_da as Role);
        return suoi.some((p) => partecipantiNuovo.includes(p));
      })
      .map((e) => ({
        inizio: new Date(e.inizio_at).getTime(),
        fine: new Date(e.fine_at).getTime(),
      }));

    const now = Date.now();
    const slotsLiberi: string[] = [];
    const stepMs = GRANULARITA_MINUTI * 60 * 1000;

    for (
      let inizioSlot = finestraInizio.getTime();
      inizioSlot + durataMs <= finestraFine.getTime();
      inizioSlot += stepMs
    ) {
      if (inizioSlot <= now) continue;

      const fineSlot = inizioSlot + durataMs;
      const sovrapposto = occupati.some(
        (o) => inizioSlot < o.fine && fineSlot > o.inizio
      );
      if (sovrapposto) continue;

      slotsLiberi.push(new Date(inizioSlot).toISOString());
    }

    return NextResponse.json({
      activity: activity.slug,
      giorno,
      durata_minuti: activity.durata_minuti,
      insieme: activity.insieme,
      slots: slotsLiberi,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
