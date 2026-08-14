import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { slotsQuerySchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";
import { romeLocalToUtc } from "@/lib/time";

const GRANULARITA_MINUTI = 15;
const FINESTRA_INIZIO_ORA = 7;
const FINESTRA_FINE_ORA = 22;

export async function GET(request: NextRequest) {
  try {
    await requireRole(["him", "her"]);

    const parsed = slotsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { service: serviceSlug, giorno } = parsed.data;

    const supabase = getSupabaseAdmin();

    const { data: service, error: serviceError } = await supabase
      .from("service_types")
      .select("*")
      .eq("slug", serviceSlug)
      .eq("attivo", true)
      .maybeSingle();

    if (serviceError) throw new ApiError("errore_interno", serviceError.message, 500);
    if (!service) {
      return errorResponse("non_trovato", "Servizio non trovato o non attivo.", 404);
    }

    const finestraInizio = romeLocalToUtc(giorno, FINESTRA_INIZIO_ORA, 0);
    const finestraFine = romeLocalToUtc(giorno, FINESTRA_FINE_ORA, 0);
    const durataMs = service.durata_minuti * 60 * 1000;

    const { data: prenotazioniEsistenti, error: bookingsError } = await supabase
      .from("bookings")
      .select("inizio_at, fine_at")
      .not("stato", "in", "(rifiutata,annullata)")
      .lt("inizio_at", finestraFine.toISOString())
      .gt("fine_at", finestraInizio.toISOString());

    if (bookingsError) throw new ApiError("errore_interno", bookingsError.message, 500);

    const occupati = (prenotazioniEsistenti ?? []).map((b) => ({
      inizio: new Date(b.inizio_at).getTime(),
      fine: new Date(b.fine_at).getTime(),
    }));

    const now = Date.now();
    const anticipoMs = service.richiede_anticipo_ore
      ? service.richiede_anticipo_ore * 60 * 60 * 1000
      : 0;
    const primoOrarioValido = now + anticipoMs;

    const slotsLiberi: string[] = [];
    const stepMs = GRANULARITA_MINUTI * 60 * 1000;

    for (
      let inizioSlot = finestraInizio.getTime();
      inizioSlot + durataMs <= finestraFine.getTime();
      inizioSlot += stepMs
    ) {
      const fineSlot = inizioSlot + durataMs;

      if (inizioSlot < primoOrarioValido) continue;

      const sovrapposto = occupati.some(
        (o) => inizioSlot < o.fine && fineSlot > o.inizio
      );
      if (sovrapposto) continue;

      slotsLiberi.push(new Date(inizioSlot).toISOString());
    }

    return NextResponse.json({
      service: service.slug,
      giorno,
      durata_minuti: service.durata_minuti,
      slots: slotsLiberi,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
