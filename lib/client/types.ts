export type Role = "him" | "her";

export interface ServiceType {
  id: string;
  slug: string;
  nome: string;
  descrizione: string | null;
  durata_minuti: number;
  emoji: string | null;
  attivo: boolean;
  richiede_anticipo_ore: number | null;
  ordine: number;
}

export type BookingStato = "richiesta" | "confermata" | "rifiutata" | "completata" | "annullata";

export interface Booking {
  id: string;
  service_type_id: string;
  inizio_at: string;
  fine_at: string;
  stato: BookingStato;
  nota_richiedente: string | null;
  nota_risposta: string | null;
  creata_da: Role;
  creato_at: string;
  aggiornato_at: string;
  service_types: {
    slug: string;
    nome: string;
    emoji: string | null;
    durata_minuti: number;
  } | null;
}

export type SosStato = "aperta" | "presa_in_carico" | "conclusa" | "scaduta";

export interface SosRequest {
  id: string;
  livello: 1 | 2 | 3;
  nota: string | null;
  stato: SosStato;
  eta_minuti: number | null;
  presa_in_carico_at: string | null;
  conclusa_at: string | null;
  telegram_message_id: number | null;
  creato_at: string;
  aggiornato_at: string;
}

export interface SosActive {
  sos: SosRequest | null;
  countdown_secondi: number | null;
  eta_at: string | null;
}

export interface Availability {
  disponibile: boolean;
  messaggio: string | null;
  aggiornata_at: string;
}

export interface Reward {
  id: string;
  titolo: string;
  descrizione: string | null;
  costo_punti: number | null;
  usi_massimi: number | null;
  attivo: boolean;
}

export type RedemptionStato = "richiesto" | "onorato" | "scaduto";

export interface Redemption {
  id: string;
  reward_id: string;
  riscattato_at: string;
  stato: RedemptionStato;
  onorato_at: string | null;
  rewards: { titolo: string; descrizione: string | null } | null;
}

export interface MoodLog {
  id: string;
  valore: 1 | 2 | 3 | 4 | 5;
  nota: string | null;
  registrato_at: string;
}

export interface DailyDrop {
  id: string;
  tipo: "audio" | "testo";
  contenuto_testo: string | null;
  storage_path: string | null;
  audio_url: string | null;
  pubblicato_per: string;
  sbloccato: boolean;
  ascoltato_at: string | null;
}

export interface RoostMedia {
  id: string;
  storage_path: string;
  image_url: string | null;
  didascalia: string | null;
  mostrata_count: number;
  ultima_volta_at: string | null;
}
