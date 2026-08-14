import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  constantTimeEquals,
  nomeDi,
  sessionCookieOptions,
  signSessionToken,
  type Role,
} from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import { errorResponse, handleRouteError, zodErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { passphrase } = parsed.data;

    // Confrontiamo sempre entrambe le passphrase, in tempo costante, cosi' il
    // tempo di risposta non rivela quale delle due ha quasi indovinato.
    const matchesA = constantTimeEquals(passphrase, process.env.PASSPHRASE_A ?? "");
    const matchesB = constantTimeEquals(passphrase, process.env.PASSPHRASE_B ?? "");

    let role: Role | null = null;
    if (matchesA) role = "a";
    else if (matchesB) role = "b";

    if (!role) {
      return errorResponse("non_autenticato", "Passphrase non valida.", 401);
    }

    const token = await signSessionToken(role);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, sessionCookieOptions);

    return NextResponse.json({ role, nome: nomeDi(role) });
  } catch (error) {
    return handleRouteError(error);
  }
}
