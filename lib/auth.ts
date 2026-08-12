import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors";

export type Role = "him" | "her";

export const COOKIE_NAME = "sos_session";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 giorni

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET non impostata.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role === "him" || payload.role === "her") {
      return { role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

/** Confronto in tempo costante, indipendente dalla lunghezza degli input. */
export function constantTimeEquals(a: string, b: string): boolean {
  const key = "confronto-passphrase";
  const digestA = createHmac("sha256", key).update(a).digest();
  const digestB = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

export async function getSessionRole(): Promise<Role | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.role ?? null;
}

/**
 * Verifica che la richiesta abbia una sessione valida con uno dei ruoli
 * ammessi. Lancia ApiError 401 se manca/e' invalida, 403 se il ruolo non e'
 * tra quelli ammessi.
 */
export async function requireRole(
  allowed: Role | Role[]
): Promise<{ role: Role }> {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  const role = await getSessionRole();

  if (!role) {
    throw new ApiError(
      "non_autenticato",
      "Devi effettuare l'accesso.",
      401
    );
  }

  if (!allowedRoles.includes(role)) {
    throw new ApiError(
      "non_autorizzato",
      "Non hai i permessi per questa azione.",
      403
    );
  }

  return { role };
}
