"use client";

import { toZonedTime } from "date-fns-tz";
import { ROME_TZ } from "@/lib/time";

// Il backend non modella un orario di lavoro: 9:00-18:00 e' un'assunzione
// scelta per questa UI (non c'e' un dato corrispondente da leggere via API).
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;

function formatOreMinuti(oreDecimali: number): string {
  const totMin = Math.max(0, Math.round(oreDecimali * 60));
  const h = Math.floor(totMin / 60);
  const m = totMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export interface DayInfo {
  endOfDayLabel: string;
  weekendInLabel: string;
  dayPct: number;
  dayLine: string;
}

export function computeDayInfo(now: Date): DayInfo {
  const zoned = toZonedTime(now, ROME_TZ);
  const hourFrac = zoned.getHours() + zoned.getMinutes() / 60 + zoned.getSeconds() / 3600;
  const totalHours = WORK_END_HOUR - WORK_START_HOUR;

  const elapsedClamped = Math.min(Math.max(hourFrac - WORK_START_HOUR, 0), totalHours);
  const dayPct = Math.round((elapsedClamped / totalHours) * 100);

  let endOfDayLabel: string;
  let dayLine: string;
  if (hourFrac >= WORK_END_HOUR) {
    endOfDayLabel = "finita";
    dayLine = "La giornata di lavoro e' finita. Il resto e' tuo.";
  } else if (hourFrac < WORK_START_HOUR) {
    endOfDayLabel = formatOreMinuti(totalHours);
    dayLine = "Non e' ancora iniziata.";
  } else {
    const remaining = WORK_END_HOUR - hourFrac;
    endOfDayLabel = formatOreMinuti(remaining);
    dayLine = `Sei al ${dayPct}% della giornata. Poi e' tuo.`;
  }

  const dow = zoned.getDay(); // 0 = domenica ... 6 = sabato
  const weekendInLabel = dow === 6 || dow === 0 ? "ora" : `${6 - dow} gg`;

  return { endOfDayLabel, weekendInLabel, dayPct, dayLine };
}
