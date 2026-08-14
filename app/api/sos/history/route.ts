import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { sosHistoryQuerySchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";
import { romeLocalToUtc, romeWeekday } from "@/lib/time";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["him", "her"]);

    const parsed = sosHistoryQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { mese } = parsed.data;

    const [annoStr, meseStr] = mese.split("-");
    const anno = Number(annoStr);
    const meseNum = Number(meseStr);
    const inizioMese = romeLocalToUtc(`${mese}-01`, 0, 0);
    const primoGiornoProssimoMese =
      meseNum === 12
        ? `${anno + 1}-01-01`
        : `${anno}-${String(meseNum + 1).padStart(2, "0")}-01`;
    const fineMese = romeLocalToUtc(primoGiornoProssimoMese, 0, 0);

    const supabase = getSupabaseAdmin();
    const { data: sosList, error } = await supabase
      .from("sos_requests")
      .select("*")
      .gte("creato_at", inizioMese.toISOString())
      .lt("creato_at", fineMese.toISOString())
      .order("creato_at", { ascending: true });

    if (error) throw new ApiError("errore_interno", error.message, 500);

    const perLivello: Record<"1" | "2" | "3", number> = { "1": 0, "2": 0, "3": 0 };
    const perGiornoSettimana: Record<string, number> = {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
    };

    for (const sos of sosList ?? []) {
      const livelloKey = String(sos.livello) as "1" | "2" | "3";
      perLivello[livelloKey] = (perLivello[livelloKey] ?? 0) + 1;

      const giorno = String(romeWeekday(sos.creato_at));
      perGiornoSettimana[giorno] = (perGiornoSettimana[giorno] ?? 0) + 1;
    }

    return NextResponse.json({
      mese,
      sos: sosList,
      aggregati: {
        per_livello: perLivello,
        per_giorno_settimana: perGiornoSettimana,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
