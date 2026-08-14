import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors";

/**
 * Due persone con gli stessi identici permessi. I ruoli sono neutri ('a' e
 * 'b') e i nomi visualizzati arrivano dalle env var NOME_A / NOME_B, cosi'
 * si cambiano senza toccare database o codice.
 */
export type Role = "a" | "b";

export const COOKIE_NAME = "ganzelli_session";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 giorni

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET non impostata.");
  }
  return new TextEncoder().encode(secret);
}

export function nomeDi(role: Role): string {
  const nome = role === "a" ? process.env.NOME_A : process.env.NOME_B;
  return nome?.trim() || (role === "a" ? "Persona A" : "Persona B");
}

export function altroRuolo(role: Role): Role {
  return role === "a" ? "b" : "a";
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
    if (payload.role === "a" || payload.role === "b") {
      return { role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  // In produzione (Vercel, sempre https) il cookie e' Secure. In sviluppo
  // locale su http alcuni browser rifiutano i cookie Secure, il che
  // impedirebbe del tutto il login: li' resta senza flag.
  secure: process.env.NODE_ENV === "production",
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
 * Richiede una sessione valida. Non c'e' un parametro "ruolo ammesso": in
 * questa app i due ruoli possono fare esattamente le stesse cose, e chi puo'
 * agire su un singolo evento si decide caso per caso nella route.
 */
export async function requireSession(): Promise<{ role: Role }> {
  const role = await getSessionRole();

  if (!role) {
    throw new ApiError("non_autenticato", "Devi effettuare l'accesso.", 401);
  }

  return { role };
}
