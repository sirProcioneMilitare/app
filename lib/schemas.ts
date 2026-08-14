import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  passphrase: z.string().min(1, "La passphrase e' obbligatoria."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Eventi
// ---------------------------------------------------------------------------

export const eventStatoEnum = z.enum([
  "in_attesa",
  "confermato",
  "rifiutato",
  "annullato",
]);
export type EventStato = z.infer<typeof eventStatoEnum>;

export const eventCreateSchema = z.object({
  activity_slug: z.string().min(1, "activity_slug e' obbligatorio."),
  inizio_at: z.string().datetime({
    offset: true,
    message: "inizio_at deve essere una data ISO valida.",
  }),
  nota: z.string().max(2000).optional(),
});
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const eventPatchSchema = z.object({
  stato: z.enum(["confermato", "rifiutato"], {
    errorMap: () => ({ message: "stato deve essere 'confermato' o 'rifiutato'." }),
  }),
  nota_risposta: z.string().max(2000).optional(),
});
export type EventPatchInput = z.infer<typeof eventPatchSchema>;

export const eventsQuerySchema = z.object({
  stato: eventStatoEnum.optional(),
  da: z.string().datetime({ offset: true }).optional(),
  a: z.string().datetime({ offset: true }).optional(),
});
export type EventsQuery = z.infer<typeof eventsQuerySchema>;

export const slotsQuerySchema = z.object({
  activity: z.string().min(1, "activity e' obbligatorio."),
  giorno: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "giorno deve essere in formato YYYY-MM-DD."),
});
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;
