import type { Role } from "./auth";

/**
 * Chi e' impegnato da un evento. Rispecchia la funzione partecipanti() usata
 * dal trigger anti-sovrapposizione nel database: un'attivita' "insieme"
 * impegna entrambi, un impegno personale solo chi l'ha creato.
 */
export function partecipanti(insieme: boolean, creatoDa: Role): Role[] {
  return insieme ? ["a", "b"] : [creatoDa];
}

export function coinvolge(insieme: boolean, creatoDa: Role, role: Role): boolean {
  return partecipanti(insieme, creatoDa).includes(role);
}

/** Gli stati che occupano davvero il calendario. */
export const STATI_ATTIVI = ["in_attesa", "confermato"] as const;
