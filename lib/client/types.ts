export type Role = "a" | "b";

export interface Me {
  role: Role;
  nome: string;
  altro: { role: Role; nome: string };
}

export interface ActivityType {
  id: string;
  slug: string;
  nome: string;
  descrizione: string | null;
  durata_minuti: number;
  emoji: string | null;
  insieme: boolean;
  attivo: boolean;
  ordine: number;
}

export type EventStato = "in_attesa" | "confermato" | "rifiutato" | "annullato";

export interface CalendarEvent {
  id: string;
  activity_type_id: string;
  inizio_at: string;
  fine_at: string;
  stato: EventStato;
  creato_da: Role;
  nota: string | null;
  nota_risposta: string | null;
  risposto_at: string | null;
  creato_at: string;
  aggiornato_at: string;
  activity_types: {
    slug: string;
    nome: string;
    emoji: string | null;
    durata_minuti: number;
    insieme: boolean;
  } | null;
}

export interface SlotsResponse {
  activity: string;
  giorno: string;
  durata_minuti: number;
  insieme: boolean;
  slots: string[];
}
