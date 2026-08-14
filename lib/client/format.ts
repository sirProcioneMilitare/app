import { dateInRome, ROME_TZ, todayInRome } from "@/lib/time";

const timeFmt = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ROME_TZ,
});

const giornoLungoFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: ROME_TZ,
});

export function formatOra(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatIntervallo(inizioAt: string, fineAt: string): string {
  return `${formatOra(inizioAt)} → ${formatOra(fineAt)}`;
}

/** "oggi" / "domani" / "giovedì 3 settembre" */
export function formatGiorno(giorno: string): string {
  const oggi = todayInRome();
  const domani = dateInRome(new Date(Date.now() + 86400000));

  if (giorno === oggi) return "oggi";
  if (giorno === domani) return "domani";

  // Mezzogiorno per stare lontani dai bordi del fuso orario.
  return giornoLungoFmt.format(new Date(`${giorno}T12:00:00Z`));
}

export function giorniProssimi(quanti: number): string[] {
  return Array.from({ length: quanti }, (_, i) =>
    dateInRome(new Date(Date.now() + i * 86400000))
  );
}
