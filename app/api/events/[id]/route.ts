import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { coinvolge } from "@/lib/participants";
import { eventPatchSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

const idSchema = z.string().uuid();

const SELECT_CON_ATTIVITA =
  "*, activity_types(slug, nome, emoji, durata_minuti, insieme)";

/** Risponde a un invito: solo chi l'ha ricevuto, e solo se e' ancora in attesa. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await requireSession();

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return errorResponse("input_non_valido", "id non valido.", 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = eventPatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { stato, nota_risposta } = parsed.data;

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("id, stato, creato_da")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);
    if (!existing) return errorResponse("non_trovato", "Impegno non trovato.", 404);

    if (existing.stato !== "in_attesa") {
      return errorResponse(
        "conflitto",
        `Questo invito e' gia' in stato "${existing.stato}".`,
        409
      );
    }

    if (existing.creato_da === role) {
      return errorResponse(
        "non_autorizzato",
        "Non puoi rispondere a un invito che hai mandato tu.",
        403
      );
    }

    const { data: evento, error: updateError } = await supabase
      .from("events")
      .update({
        stato,
        nota_risposta: nota_risposta ?? null,
        risposto_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_CON_ATTIVITA)
      .single();

    if (updateError) {
      if (updateError.message?.includes("sovrapposizione")) {
        return errorResponse(
          "conflitto",
          "Nel frattempo si e' creato un altro impegno a quest'ora.",
          409
        );
      }
      throw new ApiError("errore_interno", updateError.message, 500);
    }

    return NextResponse.json({ event: evento });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Annulla un impegno. Puo' farlo chiunque sia coinvolto. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await requireSession();

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return errorResponse("input_non_valido", "id non valido.", 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("id, stato, creato_da, activity_types(insieme)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new ApiError("errore_interno", fetchError.message, 500);
    if (!existing) return errorResponse("non_trovato", "Impegno non trovato.", 404);

    const attivita = existing.activity_types as unknown as { insieme: boolean } | null;
    if (!coinvolge(attivita?.insieme ?? false, existing.creato_da, role)) {
      return errorResponse(
        "non_autorizzato",
        "Questo impegno non ti riguarda.",
        403
      );
    }

    if (existing.stato !== "in_attesa" && existing.stato !== "confermato") {
      return errorResponse(
        "conflitto",
        `Non puoi annullare un impegno in stato "${existing.stato}".`,
        409
      );
    }

    const { data: evento, error: updateError } = await supabase
      .from("events")
      .update({ stato: "annullato" })
      .eq("id", id)
      .select(SELECT_CON_ATTIVITA)
      .single();

    if (updateError) throw new ApiError("errore_interno", updateError.message, 500);

    return NextResponse.json({ event: evento });
  } catch (error) {
    return handleRouteError(error);
  }
}
