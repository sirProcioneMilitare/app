export const BINGO_PHRASES = [
  "ricapitolando",
  "ti mando una mail",
  "condivido lo schermo",
  "riesci a vedermi?",
  "sei in muto",
  "facciamo un punto",
  "allineiamoci",
  "mi sentite?",
  "vado veloce",
  "torniamo su questo",
  "apro una parentesi",
  "ci sentiamo offline",
  "deep dive",
  "asap",
  "chi prende la palla?",
  "scusate, ero mutato",
  "cane che abbaia",
  "ho un altro meeting",
  "next steps",
  "possiamo chiudere prima",
  "chiedo al team",
  "giro la domanda",
  "condivido dopo le slide",
  "la butto li'",
];

export function bingoCellText(i: number): string {
  if (i === 12) return "LIBERO";
  return BINGO_PHRASES[i > 12 ? i - 1 : i] ?? "";
}

export function bingoHasLine(marks: Record<number, boolean>): boolean {
  const on = (i: number) => !!marks[i];

  for (let r = 0; r < 5; r++) {
    let ok = true;
    for (let c = 0; c < 5; c++) if (!on(r * 5 + c)) ok = false;
    if (ok) return true;
  }
  for (let c = 0; c < 5; c++) {
    let ok = true;
    for (let r = 0; r < 5; r++) if (!on(r * 5 + c)) ok = false;
    if (ok) return true;
  }
  let d1 = true;
  let d2 = true;
  for (let i = 0; i < 5; i++) {
    if (!on(i * 5 + i)) d1 = false;
    if (!on(i * 5 + (4 - i))) d2 = false;
  }
  return d1 || d2;
}
