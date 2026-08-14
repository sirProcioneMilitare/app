import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron";
import { ApiError, handleRouteError } from "@/lib/errors";
import { SCADENZA_ORE } from "@/lib/sos";
import { getSupabaseAdmin } from "@/lib/supabase";

const RISCATTI_SCADENZA_GIORNI = 30;

async function eseguiHousekeeping(request: NextRequest) {
  try {
    requireCronAuth(request);

    const supabase = getSupabaseAdmin();
    const now = new Date();

    const { data: prenotazioniCompletate, error: bookingsError } = await supabase
      .from("bookings")
      .update({ stato: "completata" })
      .eq("stato", "confermata")
      .lt("fine_at", now.toISOString())
      .select("id");

    if (bookingsError) throw new ApiError("errore_interno", bookingsError.message, 500);

    const sogliaSos = new Date(
      now.getTime() - SCADENZA_ORE * 60 * 60 * 1000
    ).toISOString();

    const { data: sosScaduti, error: sosError } = await supabase
      .from("sos_requests")
      .update({ stato: "scaduta" })
      .eq("stato", "aperta")
      .lt("creato_at", sogliaSos)
      .select("id");

    if (sosError) throw new ApiError("errore_interno", sosError.message, 500);

    // Un SOS preso in carico ma mai concluso a mano ("Sto meglio") resterebbe
    // altrimenti attivo per sempre, e GET /api/sos/active continuerebbe a
    // restituirlo. Qui viene chiuso: e' stato gestito, quindi "conclusa" e non
    // "scaduta".
    const { data: sosConclusi, error: sosConclusiError } = await supabase
      .from("sos_requests")
      .update({ stato: "conclusa", conclusa_at: now.toISOString() })
      .eq("stato", "presa_in_carico")
      .lt("creato_at", sogliaSos)
      .select("id");

    if (sosConclusiError)
      throw new ApiError("errore_interno", sosConclusiError.message, 500);

    const sogliaRiscatti = new Date(
      now.getTime() - RISCATTI_SCADENZA_GIORNI * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: riscattiScaduti, error: redemptionsError } = await supabase
      .from("reward_redemptions")
      .update({ stato: "scaduto" })
      .eq("stato", "richiesto")
      .lt("riscattato_at", sogliaRiscatti)
      .select("id");

    if (redemptionsError)
      throw new ApiError("errore_interno", redemptionsError.message, 500);

    return NextResponse.json({
      prenotazioni_completate: prenotazioniCompletate?.length ?? 0,
      sos_scaduti: sosScaduti?.length ?? 0,
      sos_conclusi: sosConclusi?.length ?? 0,
      riscatti_scaduti: riscattiScaduti?.length ?? 0,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// Vercel Cron invoca con GET; POST resta disponibile per test manuali,
// coerentemente col contratto API.
export const GET = eseguiHousekeeping;
export const POST = eseguiHousekeeping;
