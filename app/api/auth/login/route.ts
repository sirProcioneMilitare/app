import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  constantTimeEquals,
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
    const passphraseHim = process.env.PASSPHRASE_HIM ?? "";
    const passphraseHer = process.env.PASSPHRASE_HER ?? "";

    let role: Role | null = null;
    // Confrontiamo sempre entrambe le passphrase, in tempo costante, cosi'
    // il tempo di risposta non rivela quale ruolo (se uno) ha quasi indovinato.
    const matchesHim = constantTimeEquals(passphrase, passphraseHim);
    const matchesHer = constantTimeEquals(passphrase, passphraseHer);
    if (matchesHim) role = "him";
    else if (matchesHer) role = "her";

    if (!role) {
      return errorResponse(
        "non_autenticato",
        "Passphrase non valida.",
        401
      );
    }

    const token = await signSessionToken(role);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, sessionCookieOptions);

    return NextResponse.json({ role });
  } catch (error) {
    return handleRouteError(error);
  }
}
