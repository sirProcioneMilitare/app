import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { moodCreateSchema, moodQuerySchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    await requireRole(["him", "her"]);

    const body = await request.json().catch(() => null);
    const parsed = moodCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { valore, nota } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { data: mood, error } = await supabase
      .from("mood_logs")
      .insert({ valore, nota: nota ?? null })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23P01") {
        return errorResponse(
          "conflitto",
          "Puoi registrare l'umore al massimo una volta ogni 4 ore.",
          409
        );
      }
      throw new ApiError("errore_interno", error.message, 500);
    }

    return NextResponse.json({ mood }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(["him", "her"]);

    const parsed = moodQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const giorni = parsed.data.giorni ? Number(parsed.data.giorni) : 30;

    const soglia = new Date(Date.now() - giorni * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("mood_logs")
      .select("id, valore, nota, registrato_at")
      .gte("registrato_at", soglia)
      .order("registrato_at", { ascending: true });

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ mood_logs: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
