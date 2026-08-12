import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, handleRouteError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireRole(["him", "her"]);

    const supabase = getSupabaseAdmin();
    const { data: sos, error } = await supabase
      .from("sos_requests")
      .select("*")
      .in("stato", ["aperta", "presa_in_carico"])
      .order("creato_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new ApiError("errore_interno", error.message, 500);

    if (!sos) {
      return NextResponse.json({ sos: null, countdown_secondi: null, eta_at: null });
    }

    let countdownSecondi: number | null = null;
    let etaAt: string | null = null;

    if (sos.stato === "presa_in_carico" && sos.eta_minuti && sos.presa_in_carico_at) {
      const eta = new Date(
        new Date(sos.presa_in_carico_at).getTime() + sos.eta_minuti * 60 * 1000
      );
      etaAt = eta.toISOString();
      countdownSecondi = Math.max(0, Math.round((eta.getTime() - Date.now()) / 1000));
    }

    return NextResponse.json({ sos, countdown_secondi: countdownSecondi, eta_at: etaAt });
  } catch (error) {
    return handleRouteError(error);
  }
}
