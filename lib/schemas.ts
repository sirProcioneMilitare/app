import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  passphrase: z.string().min(1, "La passphrase e' obbligatoria."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Prenotazioni
// ---------------------------------------------------------------------------

export const bookingStatoEnum = z.enum([
  "richiesta",
  "confermata",
  "rifiutata",
  "completata",
  "annullata",
]);
export type BookingStato = z.infer<typeof bookingStatoEnum>;

export const bookingCreateSchema = z.object({
  service_slug: z.string().min(1, "service_slug e' obbligatorio."),
  inizio_at: z.string().datetime({ offset: true, message: "inizio_at deve essere una data ISO valida." }),
  nota_richiedente: z.string().max(2000).optional(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const bookingPatchSchema = z.object({
  stato: z.enum(["confermata", "rifiutata"], {
    errorMap: () => ({ message: "stato deve essere 'confermata' o 'rifiutata'." }),
  }),
  nota_risposta: z.string().max(2000).optional(),
});
export type BookingPatchInput = z.infer<typeof bookingPatchSchema>;

export const bookingsQuerySchema = z.object({
  stato: bookingStatoEnum.optional(),
  da: z.string().datetime({ offset: true }).optional(),
  a: z.string().datetime({ offset: true }).optional(),
});
export type BookingsQuery = z.infer<typeof bookingsQuerySchema>;

export const slotsQuerySchema = z.object({
  service: z.string().min(1, "service e' obbligatorio."),
  giorno: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "giorno deve essere in formato YYYY-MM-DD."),
});
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;
