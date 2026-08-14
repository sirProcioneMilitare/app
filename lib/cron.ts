import "server-only";

import type { NextRequest } from "next/server";
import { ApiError } from "./errors";

export function requireCronAuth(request: NextRequest): void {
  const header = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || header !== `Bearer ${expected}`) {
    throw new ApiError("non_autenticato", "Token cron non valido.", 401);
  }
}
