"use client";

import { apiFetch, ApiClientError } from "./api";
import type {
  ActivityType,
  CalendarEvent,
  EventStato,
  Me,
  SlotsResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function login(passphrase: string) {
  return apiFetch<{ role: "a" | "b"; nome: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ passphrase }),
  });
}

export function logout() {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function getMe() {
  return apiFetch<Me>("/api/auth/me");
}

// ---------------------------------------------------------------------------
// Attivita' ed eventi
// ---------------------------------------------------------------------------

export function getActivities() {
  return apiFetch<{ activities: ActivityType[] }>("/api/activities");
}

export function getEvents(params?: { stato?: EventStato; da?: string; a?: string }) {
  const qs = new URLSearchParams();
  if (params?.stato) qs.set("stato", params.stato);
  if (params?.da) qs.set("da", params.da);
  if (params?.a) qs.set("a", params.a);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ events: CalendarEvent[] }>(`/api/events${suffix}`);
}

export function createEvent(input: {
  activity_slug: string;
  inizio_at: string;
  nota?: string;
}) {
  return apiFetch<{ event: CalendarEvent }>("/api/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function respondEvent(
  id: string,
  stato: "confermato" | "rifiutato",
  nota_risposta?: string
) {
  return apiFetch<{ event: CalendarEvent }>(`/api/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ stato, nota_risposta }),
  });
}

export function cancelEvent(id: string) {
  return apiFetch<{ event: CalendarEvent }>(`/api/events/${id}`, {
    method: "DELETE",
  });
}

export function getSlots(activity: string, giorno: string) {
  return apiFetch<SlotsResponse>(
    `/api/events/slots?activity=${encodeURIComponent(activity)}&giorno=${giorno}`
  );
}

export { ApiClientError };
