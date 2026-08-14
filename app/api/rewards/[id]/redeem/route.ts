import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

const idSchema = z.string().uuid();

export async function POST(
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

    const { data: reward, error: rewardError } = await supabase
      .from("rewards")
      .select("id, attivo")
      .eq("id", id)
      .maybeSingle();

    if (rewardError) throw new ApiError("errore_interno", rewardError.message, 500);
    if (!reward || !reward.attivo) {
      return errorResponse("non_trovato", "Buono non trovato o non attivo.", 404);
    }

    const { data: redemption, error: insertError } = await supabase
      .from("reward_redemptions")
      .insert({ reward_id: id })
      .select("*, rewards(titolo, descrizione)")
      .single();

    if (insertError) {
      if (insertError.message?.includes("usi_massimi_raggiunto")) {
        return errorResponse(
          "conflitto",
          "Hai raggiunto il numero massimo di utilizzi per questo buono.",
          409
        );
      }
      throw new ApiError("errore_interno", insertError.message, 500);
    }

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
