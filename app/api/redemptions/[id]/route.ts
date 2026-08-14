import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { redemptionPatchSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

const idSchema = z.string().uuid();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Solo lei onora un buono riscattato.
    await requireRole("her");

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return errorResponse("input_non_valido", "id non valido.", 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = redemptionPatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("reward_redemptions")
      .select("id, stato")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);
    if (!existing) return errorResponse("non_trovato", "Riscatto non trovato.", 404);

    if (existing.stato !== "richiesto") {
      return errorResponse(
        "conflitto",
        `Non puoi onorare un riscatto in stato "${existing.stato}".`,
        409
      );
    }

    const { data: redemption, error: updateError } = await supabase
      .from("reward_redemptions")
      .update({ stato: "onorato", onorato_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, rewards(titolo, descrizione)")
      .single();

    if (updateError) throw new ApiError("errore_interno", updateError.message, 500);

    return NextResponse.json({ redemption });
  } catch (error) {
    return handleRouteError(error);
  }
}
