import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { dailyCreateFieldsSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";
import { romeHourFraction, todayInRome } from "@/lib/time";

const DAILY_BUCKET = "daily-media";
const ORARIO_SBLOCCO = 8.5; // 08:30

async function firmaUrlAudio(storagePath: string | null) {
  if (!storagePath) return null;
  const { data } = await getSupabaseAdmin()
    .storage.from(DAILY_BUCKET)
    .createSignedUrl(storagePath, 300);
  return data?.signedUrl ?? null;
}

export async function GET() {
  try {
    const { role } = await requireRole(["him", "her"]);

    const supabase = getSupabaseAdmin();
    const oggi = todayInRome();

    const { data: drops, error } = await supabase
      .from("daily_drops")
      .select("*")
      .eq("pubblicato_per", oggi);

    if (error) throw new ApiError("errore_interno", error.message, 500);

    let visibili = drops ?? [];

    if (role === "him") {
      const oraSbloccata = romeHourFraction() >= ORARIO_SBLOCCO;
      visibili = visibili.filter((d) => d.sbloccato && oraSbloccata);
    }

    if (visibili.length === 0) {
      return errorResponse(
        "non_trovato",
        "Nessun contenuto disponibile per oggi.",
        404
      );
    }

    const dropsConUrl = await Promise.all(
      visibili.map(async (d) => ({
        ...d,
        audio_url: await firmaUrlAudio(d.storage_path),
      }))
    );

    return NextResponse.json({ drops: dropsConUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Solo lei carica i contenuti quotidiani.
    await requireRole("her");

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return errorResponse(
        "input_non_valido",
        "Il body deve essere multipart/form-data.",
        400
      );
    }

    const parsed = dailyCreateFieldsSchema.safeParse({
      tipo: formData.get("tipo"),
      pubblicato_per: formData.get("pubblicato_per"),
      contenuto_testo: formData.get("contenuto_testo") ?? undefined,
    });
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { tipo, pubblicato_per, contenuto_testo } = parsed.data;

    const file = formData.get("file");
    const supabase = getSupabaseAdmin();

    let storagePath: string | null = null;

    if (tipo === "audio") {
      if (!(file instanceof File)) {
        return errorResponse(
          "input_non_valido",
          "Il campo 'file' e' obbligatorio per i drop audio.",
          400
        );
      }

      const estensione = file.name.split(".").pop() || "webm";
      storagePath = `${pubblicato_per}/${crypto.randomUUID()}.${estensione}`;

      const { error: uploadError } = await supabase.storage
        .from(DAILY_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) throw new ApiError("errore_interno", uploadError.message, 500);
    } else if (!contenuto_testo) {
      return errorResponse(
        "input_non_valido",
        "Il campo 'contenuto_testo' e' obbligatorio per i drop testuali.",
        400
      );
    }

    const { data: drop, error: insertError } = await supabase
      .from("daily_drops")
      .insert({
        tipo,
        pubblicato_per,
        contenuto_testo: tipo === "testo" ? contenuto_testo : null,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return errorResponse(
          "conflitto",
          "Esiste gia' un contenuto di questo tipo per questo giorno.",
          409
        );
      }
      throw new ApiError("errore_interno", insertError.message, 500);
    }

    return NextResponse.json({ drop }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
