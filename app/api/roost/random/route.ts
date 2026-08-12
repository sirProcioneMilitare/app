import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

const ROOST_BUCKET = "roost-media";

function pescaConProbabilitaInversa<T extends { mostrata_count: number }>(
  righe: T[]
): T {
  const pesi = righe.map((r) => 1 / (r.mostrata_count + 1));
  const totale = pesi.reduce((sum, p) => sum + p, 0);
  let soglia = Math.random() * totale;

  for (let i = 0; i < righe.length; i++) {
    soglia -= pesi[i]!;
    if (soglia <= 0) return righe[i]!;
  }

  return righe[righe.length - 1]!;
}

export async function GET() {
  try {
    await requireRole(["him", "her"]);

    const supabase = getSupabaseAdmin();
    const { data: media, error } = await supabase
      .from("roost_media")
      .select("*");

    if (error) throw new ApiError("errore_interno", error.message, 500);
    if (!media || media.length === 0) {
      return errorResponse("non_trovato", "Nessuna foto disponibile.", 404);
    }

    const scelta = pescaConProbabilitaInversa(media);

    const { data: updated, error: updateError } = await supabase
      .from("roost_media")
      .update({
        mostrata_count: scelta.mostrata_count + 1,
        ultima_volta_at: new Date().toISOString(),
      })
      .eq("id", scelta.id)
      .select("*")
      .single();

    if (updateError) throw new ApiError("errore_interno", updateError.message, 500);

    const { data: signed } = await supabase.storage
      .from(ROOST_BUCKET)
      .createSignedUrl(updated.storage_path, 300);

    return NextResponse.json({ media: { ...updated, image_url: signed?.signedUrl ?? null } });
  } catch (error) {
    return handleRouteError(error);
  }
}
