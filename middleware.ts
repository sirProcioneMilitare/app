import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ganzelli_session";

// Unico percorso raggiungibile senza cookie: e' il modo per ottenerlo.
const PUBLIC_PATHS = [/^\/api\/auth\/login$/];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return unauthorized();

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
    { error: { code: "non_autenticato", message: "Devi effettuare l'accesso." } },
    { status: 401 }
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
