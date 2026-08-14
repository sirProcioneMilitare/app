"use client";

import { apiFetch, ApiClientError } from "./api";
import type {
  Availability,
  Booking,
  BookingStato,
  DailyDrop,
  MoodLog,
  Redemption,
  Reward,
  RoostMedia,
  ServiceType,
  SosActive,
  SosRequest,
} from "./types";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function login(passphrase: string) {
  return apiFetch<{ role: "him" | "her" }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ passphrase }),
  });
}

export function logout() {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Prenotazioni
// ---------------------------------------------------------------------------

export function getServices() {
  return apiFetch<{ services: ServiceType[] }>("/api/services");
}

export function getBookings(params?: { stato?: BookingStato }) {
  const qs = params?.stato ? `?stato=${params.stato}` : "";
  return apiFetch<{ bookings: Booking[] }>(`/api/bookings${qs}`);
}

export function createBooking(input: {
  service_slug: string;
  inizio_at: string;
  nota_richiedente?: string;
}) {
  return apiFetch<{ booking: Booking }>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function respondBooking(id: string, stato: "confermata" | "rifiutata", nota_risposta?: string) {
  return apiFetch<{ booking: Booking }>(`/api/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ stato, nota_risposta }),
  });
}

export function cancelBooking(id: string) {
  return apiFetch<{ booking: Booking }>(`/api/bookings/${id}`, { method: "DELETE" });
}

export function getSlots(service: string, giorno: string) {
  return apiFetch<{ service: string; giorno: string; durata_minuti: number; slots: string[] }>(
    `/api/bookings/slots?service=${encodeURIComponent(service)}&giorno=${giorno}`
  );
}

// ---------------------------------------------------------------------------
// SOS
// ---------------------------------------------------------------------------

export interface SosDebounceError {
  sos_esistente: SosRequest;
  minuti_rimanenti: number;
}

export async function sendSos(livello: 1 | 2 | 3, nota?: string) {
  try {
    return await apiFetch<{ sos: SosRequest }>("/api/sos", {
      method: "POST",
      body: JSON.stringify({ livello, nota }),
    });
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 409) {
      const details = err.details as { sos_esistente?: SosRequest; minuti_rimanenti?: number } | undefined;
      if (details?.sos_esistente) {
        const debounceErr = new ApiClientError(err.code, err.message, err.status, {
          sos_esistente: details.sos_esistente,
          minuti_rimanenti: details.minuti_rimanenti ?? 0,
        });
        throw debounceErr;
      }
    }
    throw err;
  }
}

export function getSosActive() {
  return apiFetch<SosActive>("/api/sos/active");
}

export function concludeSos(id: string) {
  return apiFetch<{ sos: SosRequest }>(`/api/sos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ stato: "conclusa" }),
  });
}

// ---------------------------------------------------------------------------
// Disponibilita'
// ---------------------------------------------------------------------------

export function getAvailability() {
  return apiFetch<{ availability: Availability }>("/api/availability");
}

export function setAvailability(disponibile: boolean, messaggio: string | null) {
  return apiFetch<{ availability: Availability }>("/api/availability", {
    method: "PUT",
    body: JSON.stringify({ disponibile, messaggio }),
  });
}

// ---------------------------------------------------------------------------
// Buoni
// ---------------------------------------------------------------------------

export function getRewards() {
  return apiFetch<{ rewards: Reward[] }>("/api/rewards");
}

export function redeemReward(id: string) {
  return apiFetch<{ redemption: Redemption }>(`/api/rewards/${id}/redeem`, { method: "POST" });
}

export function getRedemptions() {
  return apiFetch<{ redemptions: Redemption[] }>("/api/redemptions");
}

export function honorRedemption(id: string) {
  return apiFetch<{ redemption: Redemption }>(`/api/redemptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ stato: "onorato" }),
  });
}

// ---------------------------------------------------------------------------
// Contenuti quotidiani e pollaio
// ---------------------------------------------------------------------------

export async function getDaily(): Promise<DailyDrop[] | null> {
  try {
    const res = await apiFetch<{ drops: DailyDrop[] }>("/api/daily");
    return res.drops;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }
}

export function markDailyListened(id: string) {
  return apiFetch<{ drop: DailyDrop }>(`/api/daily/${id}/listened`, { method: "POST" });
}

export function uploadDaily(formData: FormData) {
  return apiFetch<{ drop: DailyDrop }>("/api/daily", { method: "POST", body: formData });
}

export async function getRandomRoost(): Promise<RoostMedia | null> {
  try {
    const res = await apiFetch<{ media: RoostMedia }>("/api/roost/random");
    return res.media;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Umore
// ---------------------------------------------------------------------------

export async function logMood(valore: 1 | 2 | 3 | 4 | 5, nota?: string) {
  return apiFetch<{ mood: MoodLog }>("/api/mood", {
    method: "POST",
    body: JSON.stringify({ valore, nota }),
  });
}

export function getMoodHistory(giorni = 30) {
  return apiFetch<{ mood_logs: MoodLog[] }>(`/api/mood?giorni=${giorni}`);
}

export { ApiClientError };
