import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ApiError, handleRouteError, zodErrorResponse } from "@/lib/errors";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { role } = await requireRole(["him", "her"]);

    const body = await request.json().catch(() => null);
    const parsed = pushSubscribeSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { endpoint, keys } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        role,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole(["him", "her"]);

    const body = await request.json().catch(() => null);
    const parsed = pushUnsubscribeSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { endpoint } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) throw new ApiError("errore_interno", error.message, 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
