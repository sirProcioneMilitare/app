import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Percorsi raggiungibili senza il cookie di sessione:
// - login: e' il modo per ottenere il cookie
// - webhook Telegram: autenticato con un secret token dedicato (header)
// - cron: autenticati con Authorization: Bearer CRON_SECRET, non con cookie,
//   perche' Vercel Cron non puo' inviare il nostro cookie di sessione
const PUBLIC_PATHS = [/^\/api\/auth\/login$/, /^\/api\/telegram\/webhook$/, /^\/api\/cron\//];

const COOKIE_NAME = "sos_session";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((re) => re.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/") || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return unauthorized();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET non impostata.");
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

function unauthorized() {
  return NextResponse.json(
    {
      error: {
        code: "non_autenticato",
        message: "Devi effettuare l'accesso.",
      },
    },
    { status: 401 }
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
