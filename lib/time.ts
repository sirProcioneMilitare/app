import { toZonedTime, format as formatTz } from "date-fns-tz";

export const ROME_TZ = "Europe/Rome";

/** Formatta un istante UTC nell'ora di Roma, es. "12/08/2026 18:45". */
export function formatRomeDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, ROME_TZ);
  return formatTz(zoned, "dd/MM/yyyy HH:mm", { timeZone: ROME_TZ });
}

/** Data odierna (YYYY-MM-DD) nel fuso di Roma. */
export function todayInRome(): string {
  return dateInRome(new Date());
}

/** Data (YYYY-MM-DD) di un istante qualsiasi, nel fuso di Roma. */
export function dateInRome(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, ROME_TZ);
  return formatTz(zoned, "yyyy-MM-dd", { timeZone: ROME_TZ });
}

/** Ora locale di Roma (0-23.99) per un istante dato, utile per confronti tipo "sono le 8:30 passate?". */
export function romeHourFraction(date: Date = new Date()): number {
  const zoned = toZonedTime(date, ROME_TZ);
  return zoned.getHours() + zoned.getMinutes() / 60;
}

/** Giorno della settimana (0=domenica..6=sabato) nel fuso di Roma. */
export function romeWeekday(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(d, ROME_TZ).getDay();
}

/**
 * Costruisce un istante UTC (Date) corrispondente a un orario locale di Roma
 * in un dato giorno (YYYY-MM-DD) e ora/minuti. Usato per calcolare finestre
 * come 07:00-22:00 locali.
 */
export function romeLocalToUtc(
  giorno: string,
  ore: number,
  minuti: number
): Date {
  // Proviamo l'offset e verifichiamo che il round-trip corrisponda,
  // gestendo correttamente CET/CEST.
  const naive = new Date(`${giorno}T${String(ore).padStart(2, "0")}:${String(minuti).padStart(2, "0")}:00Z`);
  const zonedOfNaive = toZonedTime(naive, ROME_TZ);
  const diffMs =
    naive.getTime() -
    Date.UTC(
      zonedOfNaive.getFullYear(),
      zonedOfNaive.getMonth(),
      zonedOfNaive.getDate(),
      zonedOfNaive.getHours(),
      zonedOfNaive.getMinutes(),
      zonedOfNaive.getSeconds()
    );
  return new Date(naive.getTime() + diffMs);
}
