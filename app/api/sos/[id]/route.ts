import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { sosPatchSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

const idSchema = z.string().uuid();

/**
 * Conclude un SOS ancora attivo. E' il "Sto meglio" dell'app: senza questo,
 * un SOS passato a presa_in_carico non tornerebbe mai indietro e
 * GET /api/sos/active continuerebbe a restituirlo per sempre.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["him", "her"]);

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return errorResponse("input_non_valido", "id non valido.", 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = sosPatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("sos_requests")
      .select("id, stato")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);
    if (!existing) return errorResponse("non_trovato", "SOS non trovato.", 404);

    if (existing.stato !== "aperta" && existing.stato !== "presa_in_carico") {
      return errorResponse(
        "conflitto",
        `Questo SOS e' gia' in stato "${existing.stato}".`,
        409
      );
    }

    const { data: sos, error: updateError } = await supabase
      .from("sos_requests")
      .update({ stato: "conclusa", conclusa_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw new ApiError("errore_interno", updateError.message, 500);

    return NextResponse.json({ sos });
  } catch (error) {
    return handleRouteError(error);
  }
}
