import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleRouteError, ApiError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireRole(["him", "her"]);

    const { data, error } = await getSupabaseAdmin()
      .from("service_types")
      .select("*")
      .eq("attivo", true)
      .order("ordine", { ascending: true });

    if (error) {
      throw new ApiError("errore_interno", error.message, 500);
    }

    return NextResponse.json({ services: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
