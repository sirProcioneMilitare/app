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

// ---------------------------------------------------------------------------
// SOS
// ---------------------------------------------------------------------------

export const sosCreateSchema = z.object({
  livello: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  nota: z.string().max(2000).optional(),
});
export type SosCreateInput = z.infer<typeof sosCreateSchema>;

export const sosHistoryQuerySchema = z.object({
  mese: z.string().regex(/^\d{4}-\d{2}$/, "mese deve essere in formato YYYY-MM."),
});
export type SosHistoryQuery = z.infer<typeof sosHistoryQuerySchema>;

export const sosPatchSchema = z.object({
  stato: z.literal("conclusa", {
    errorMap: () => ({ message: "stato deve essere 'conclusa'." }),
  }),
});
export type SosPatchInput = z.infer<typeof sosPatchSchema>;

// ---------------------------------------------------------------------------
// Disponibilita'
// ---------------------------------------------------------------------------

export const availabilityPutSchema = z.object({
  disponibile: z.boolean(),
  messaggio: z.string().max(500).nullable().optional(),
});
export type AvailabilityPutInput = z.infer<typeof availabilityPutSchema>;

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url("endpoint deve essere un URL valido."),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("endpoint deve essere un URL valido."),
});
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;

// ---------------------------------------------------------------------------
// Contenuti quotidiani
// ---------------------------------------------------------------------------

export const dailyCreateFieldsSchema = z.object({
  tipo: z.enum(["audio", "testo"]),
  pubblicato_per: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "pubblicato_per deve essere in formato YYYY-MM-DD."),
  contenuto_testo: z.string().max(5000).optional(),
});
export type DailyCreateFields = z.infer<typeof dailyCreateFieldsSchema>;

// ---------------------------------------------------------------------------
// Buoni
// ---------------------------------------------------------------------------

export const redemptionPatchSchema = z.object({
  stato: z.literal("onorato", {
    errorMap: () => ({ message: "stato deve essere 'onorato'." }),
  }),
});
export type RedemptionPatchInput = z.infer<typeof redemptionPatchSchema>;

// ---------------------------------------------------------------------------
// Umore
// ---------------------------------------------------------------------------

export const moodCreateSchema = z.object({
  valore: z.number().int().min(1).max(5),
  nota: z.string().max(1000).optional(),
});
export type MoodCreateInput = z.infer<typeof moodCreateSchema>;

export const moodQuerySchema = z.object({
  giorni: z
    .string()
    .regex(/^\d+$/, "giorni deve essere un numero intero.")
    .optional(),
});
export type MoodQuery = z.infer<typeof moodQuerySchema>;
