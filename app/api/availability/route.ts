import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { availabilityPutSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireRole(["him", "her"]);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("availability")
      .select("disponibile, messaggio, aggiornata_at")
      .single();

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ availability: data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Solo lei aggiorna la propria disponibilita'.
    await requireRole("her");

    const body = await request.json().catch(() => null);
    const parsed = availabilityPutSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { disponibile, messaggio } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("availability")
      .update({
        disponibile,
        messaggio: messaggio ?? null,
        aggiornata_at: new Date().toISOString(),
      })
      .eq("singleton", true)
      .select("disponibile, messaggio, aggiornata_at")
      .single();

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ availability: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
