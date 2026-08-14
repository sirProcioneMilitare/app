import { dateInRome, ROME_TZ, todayInRome } from "@/lib/time";

const timeFmt = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ROME_TZ,
});

export function formatBookingWhen(inizioAt: string, fineAt: string): string {
  const giornoChiave = dateInRome(inizioAt);
  const oggi = todayInRome();
  const domani = dateInRome(new Date(Date.now() + 86400000));

  const giornoLabel =
    giornoChiave === oggi
      ? "oggi"
      : giornoChiave === domani
        ? "domani"
        : new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", timeZone: ROME_TZ }).format(
            new Date(inizioAt)
          );

  return `${giornoLabel} · ${timeFmt.format(new Date(inizioAt))} → ${timeFmt.format(new Date(fineAt))}`;
}
