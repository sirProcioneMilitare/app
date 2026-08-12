import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorCode =
  | "non_autenticato"
  | "non_autorizzato"
  | "input_non_valido"
  | "non_trovato"
  | "conflitto"
  | "errore_interno";

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  );
}

export function zodErrorResponse(error: ZodError) {
  return errorResponse(
    "input_non_valido",
    "I dati inviati non sono validi.",
    400,
    error.flatten()
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  console.error("Errore non gestito nella route:", error);
  return errorResponse(
    "errore_interno",
    "Si e' verificato un errore interno.",
    500
  );
}
