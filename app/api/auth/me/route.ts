import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleRouteError } from "@/lib/errors";

export async function GET() {
  try {
    const { role } = await requireRole(["him", "her"]);
    return NextResponse.json({ role });
  } catch (error) {
    return handleRouteError(error);
  }
}
