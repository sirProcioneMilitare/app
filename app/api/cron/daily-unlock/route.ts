import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron";
import { ApiError, handleRouteError } from "@/lib/errors";
import { sendPushToRole } from "@/lib/push";
import { getSupabaseAdmin } from "@/lib/supabase";
import { romeHourFraction, todayInRome } from "@/lib/time";

const ORARIO_SBLOCCO = 8.5; // 08:30

// Il cron e' schedulato piu' volte nella finestra del mattino (vedi
// vercel.json) proprio perche' un singolo orario UTC fisso non segue il
// cambio CET/CEST. Questo guard rende l'endpoint idempotente e corretto
// indipendentemente da quando/quante volte viene chiamato: sblocca solo
// se in quel momento sono gia' le 08:30 locali, e chiamate successive non
// trovano piu' nulla da sbloccare.
async function eseguiSblocco(request: NextRequest) {
  try {
    requireCronAuth(request);

    if (romeHourFraction() < ORARIO_SBLOCCO) {
      return NextResponse.json({ sbloccati: [], motivo: "prima delle 08:30" });
    }

    const supabase = getSupabaseAdmin();
    const oggi = todayInRome();

    const { data: sbloccati, error } = await supabase
      .from("daily_drops")
      .update({ sbloccato: true })
      .eq("pubblicato_per", oggi)
      .eq("sbloccato", false)
      .select("id, tipo");

    if (error) throw new ApiError("errore_interno", error.message, 500);

    if (sbloccati && sbloccati.length > 0) {
      await sendPushToRole("him", {
        title: "Contenuto del giorno",
        body: "C'e' qualcosa di nuovo per te, oggi.",
      });
    }

    return NextResponse.json({ sbloccati: sbloccati ?? [] });
  } catch (error) {
    return handleRouteError(error);
  }
}

// Vercel Cron invoca con GET; POST resta disponibile per test manuali,
// coerentemente col contratto API.
export const GET = eseguiSblocco;
export const POST = eseguiSblocco;
