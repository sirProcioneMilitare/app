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
    const { data: drop, error } = await supabase
      .from("daily_drops")
      .update({ ascoltato_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw new ApiError("errore_interno", error.message, 500);
    if (!drop) return errorResponse("non_trovato", "Contenuto non trovato.", 404);

    return NextResponse.json({ drop });
  } catch (error) {
    return handleRouteError(error);
  }
}
