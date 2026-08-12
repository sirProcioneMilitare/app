import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { bookingCreateSchema, bookingsQuerySchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["him", "her"]);

    const parsed = bookingsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { stato, da, a } = parsed.data;

    let query = getSupabaseAdmin()
      .from("bookings")
      .select("*, service_types(slug, nome, emoji, durata_minuti)")
      .order("inizio_at", { ascending: true });

    if (stato) query = query.eq("stato", stato);
    if (da) query = query.gte("inizio_at", da);
    if (a) query = query.lte("inizio_at", a);

    const { data, error } = await query;
    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ bookings: data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { role } = await requireRole(["him", "her"]);

    const body = await request.json().catch(() => null);
    const parsed = bookingCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { service_slug, inizio_at, nota_richiedente } = parsed.data;

    const supabase = getSupabaseAdmin();

    const { data: service, error: serviceError } = await supabase
      .from("service_types")
      .select("*")
      .eq("slug", service_slug)
      .eq("attivo", true)
      .maybeSingle();

    if (serviceError) throw new ApiError("errore_interno", serviceError.message, 500);
    if (!service) {
      return errorResponse("non_trovato", "Servizio non trovato o non attivo.", 404);
    }

    const inizio = new Date(inizio_at);
    const now = new Date();

    if (inizio.getTime() <= now.getTime()) {
      return errorResponse(
        "input_non_valido",
        "Non puoi prenotare un orario nel passato.",
        400
      );
    }

    if (service.richiede_anticipo_ore !== null) {
      const minimoConsentito = new Date(
        now.getTime() + service.richiede_anticipo_ore * 60 * 60 * 1000
      );
      if (inizio.getTime() < minimoConsentito.getTime()) {
        return errorResponse(
          "input_non_valido",
          `Questo servizio richiede almeno ${service.richiede_anticipo_ore} ore di anticipo.`,
          400
        );
      }
    }

    const fine = new Date(inizio.getTime() + service.durata_minuti * 60 * 1000);

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        service_type_id: service.id,
        inizio_at: inizio.toISOString(),
        fine_at: fine.toISOString(),
        nota_richiedente: nota_richiedente ?? null,
        creata_da: role,
      })
      .select("*, service_types(slug, nome, emoji, durata_minuti)")
      .single();

    if (insertError) {
      if (insertError.code === "23P01") {
        return errorResponse(
          "conflitto",
          "C'e' gia' una prenotazione che si sovrappone a questo orario.",
          409
        );
      }
      throw new ApiError("errore_interno", insertError.message, 500);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
