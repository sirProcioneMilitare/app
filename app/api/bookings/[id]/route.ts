import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { bookingPatchSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

const idSchema = z.string().uuid();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Solo "her" puo' confermare o rifiutare una richiesta.
    await requireRole("her");

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return errorResponse("input_non_valido", "id non valido.", 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = bookingPatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { stato, nota_risposta } = parsed.data;

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("bookings")
      .select("id, stato")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);
    if (!existing) return errorResponse("non_trovato", "Prenotazione non trovata.", 404);

    if (existing.stato !== "richiesta") {
      return errorResponse(
        "conflitto",
        `Non puoi rispondere a una prenotazione in stato "${existing.stato}".`,
        409
      );
    }

    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({ stato, nota_risposta: nota_risposta ?? null })
      .eq("id", id)
      .select("*, service_types(slug, nome, emoji, durata_minuti)")
      .single();

    if (updateError) throw new ApiError("errore_interno", updateError.message, 500);

    return NextResponse.json({ booking });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["him", "her"]);

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return errorResponse("input_non_valido", "id non valido.", 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("bookings")
      .select("id, stato")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);
    if (!existing) return errorResponse("non_trovato", "Prenotazione non trovata.", 404);

    if (existing.stato !== "richiesta" && existing.stato !== "confermata") {
      return errorResponse(
        "conflitto",
        `Non puoi annullare una prenotazione in stato "${existing.stato}".`,
        409
      );
    }

    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({ stato: "annullata" })
      .eq("id", id)
      .select("*, service_types(slug, nome, emoji, durata_minuti)")
      .single();

    if (updateError) throw new ApiError("errore_interno", updateError.message, 500);

    return NextResponse.json({ booking });
  } catch (error) {
    return handleRouteError(error);
  }
}
