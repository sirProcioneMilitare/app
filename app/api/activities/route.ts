import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ApiError, handleRouteError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireSession();

    const { data, error } = await getSupabaseAdmin()
      .from("activity_types")
      .select("*")
      .eq("attivo", true)
      .order("ordine", { ascending: true });

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ activities: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
