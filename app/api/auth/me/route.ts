import { NextResponse } from "next/server";
import { altroRuolo, nomeDi, requireSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/errors";

export async function GET() {
  try {
    const { role } = await requireSession();
    const altro = altroRuolo(role);

    return NextResponse.json({
      role,
      nome: nomeDi(role),
      altro: { role: altro, nome: nomeDi(altro) },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
