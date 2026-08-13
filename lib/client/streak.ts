"use client";

import { dateInRome, todayInRome } from "@/lib/time";
import type { MoodLog } from "./types";

/**
 * Giorni consecutivi (fino a oggi, incluso) con almeno una registrazione di
 * umore. Non e' un dato del backend: e' derivato qui da mood_logs, perche'
 * il design prevede un badge "serie" ma lo schema non ha una tabella dedicata.
 */
export function computeMoodStreak(moodLogs: MoodLog[]): number {
  const giorniConLog = new Set(moodLogs.map((m) => dateInRome(m.registrato_at)));

  let streak = 0;
  const cursor = new Date();

  while (true) {
    const giorno = dateInRome(cursor);
    if (giorno === todayInRome() && !giorniConLog.has(giorno)) {
      // Oggi non ha ancora una registrazione: non rompe la serie, ma non la conta.
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!giorniConLog.has(giorno)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
