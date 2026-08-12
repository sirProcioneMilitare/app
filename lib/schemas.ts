import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  passphrase: z.string().min(1, "La passphrase e' obbligatoria."),
});
export type LoginInput = z.infer<typeof loginSchema>;
