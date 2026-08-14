import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, handleRouteError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireRole(["him", "her"]);

    const { data, error } = await getSupabaseAdmin()
      .from("rewards")
      .select("*")
      .eq("attivo", true)
      .order("creato_at", { ascending: true });

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ rewards: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
