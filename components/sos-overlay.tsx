"use client";

import { useEffect, useState } from "react";
import { formatMmSs, useSos } from "./sos-context";
import { DEBOUNCE_MINUTI, LIVELLO_DESCRIZIONI } from "@/lib/sos";
import { getAvailability } from "@/lib/client/endpoints";
import styles from "./sos-overlay.module.css";

const LIVELLI: Array<{ n: 1 | 2 | 3; sub: string }> = [
  { n: 1, sub: "" },
  { n: 2, sub: "La situazione e' degenerata." },
  { n: 3, sub: "Serve una persona, non uno snack." },
];

const NOTE_CHIPS = [
  "call infinita",
  "Non capiscono un cazzo",
  "Mi rompono tutti i coglioni",
  "Odio tutti",
];

export function SosOverlay() {
  const { active, overlayOpen, closeOverlay, send, sending, sendError, now } = useSos();
  const [livello, setLivello] = useState<1 | 2 | 3 | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const [leiDisponibile, setLeiDisponibile] = useState(true);

  const sos = active?.sos ?? null;
  const showPicker = !sos || sos.stato === "conclusa" || sos.stato === "scaduta";

  useEffect(() => {
    if (!overlayOpen || !showPicker) return;
    getAvailability()
      .then((res) => setLeiDisponibile(res.availability.disponibile))
      .catch(() => setLeiDisponibile(true));
  }, [overlayOpen, showPicker]);

  if (!overlayOpen) return null;

  const stateLabel = !sos
    ? "sos · nuovo"
    : sos.stato === "presa_in_carico"
      ? "sos · presa in carico"
      : sos.stato === "aperta"
        ? "sos · aperta"
        : "sos · nuovo";

  async function handleSend() {
    if (!livello) return;
    await send(livello, nota ?? undefined);
  }

  const etaLeftSec =
    sos?.stato === "presa_in_carico" && active?.eta_at
      ? Math.max(0, Math.round((new Date(active.eta_at).getTime() - now) / 1000))
      : 0;

  const debounceLeftSec =
    sos?.stato === "aperta"
      ? Math.max(
          0,
          DEBOUNCE_MINUTI * 60 - Math.round((now - new Date(sos.creato_at).getTime()) / 1000)
        )
      : 0;

  const bp = Math.floor(now / 1000) % 19;
  const breathPhase = bp < 4 ? "Inspira" : bp < 11 ? "Trattieni" : "Espira";
  const breathCount = bp < 4 ? 4 - bp : bp < 11 ? 11 - bp : 19 - bp;

  return (
    <div className={styles.overlay}>
      <div className={styles.topRow}>
        <div className={styles.stateLabel}>{stateLabel}</div>
        <button className={styles.exitButton} onClick={closeOverlay}>
          esci
        </button>
      </div>

      {showPicker ? (
        <>
          <div className={styles.pickWrap}>
            <div className={styles.pickTitle}>Quanto e' grave?</div>
            {LIVELLI.map((l) => (
              <button
                key={l.n}
                className={`${styles.levelButton} ${livello === l.n ? styles.selected : ""}`}
                onClick={() => setLivello(l.n)}
              >
                <span className={styles.levelBadge}>{l.n}</span>
                <span>
                  <div className={styles.levelTitle}>{LIVELLO_DESCRIZIONI[l.n]}</div>
                  {l.n === 3 && !leiDisponibile ? (
                    <div className={styles.levelSub}>Ora non e' disponibile: arrivera' tardi.</div>
                  ) : (
                    l.sub && <div className={styles.levelSub}>{l.sub}</div>
                  )}
                </span>
              </button>
            ))}
            <div className={styles.contextLabel}>contesto (facoltativo)</div>
            <div className={styles.chipRow}>
              {NOTE_CHIPS.map((t) => (
                <button
                  key={t}
                  className={`${styles.chip} ${nota === t ? styles.selected : ""}`}
                  onClick={() => setNota((cur) => (cur === t ? null : t))}
                >
                  {t}
                </button>
              ))}
            </div>
            {sendError && <div className={styles.sendError}>{sendError}</div>}
          </div>
          <button className={styles.sendButton} disabled={!livello || sending} onClick={handleSend}>
            {sending ? "Invio..." : livello ? `Manda SOS livello ${livello}` : "Scegli un livello"}
          </button>
        </>
      ) : (
        <>
          <div className={styles.sentWrap}>
            <div className={styles.breathCircleOuter}>
              <div className={styles.breathCircle}>
                <div className={styles.breathCount}>{breathCount}</div>
              </div>
            </div>
            <div>
              <div className={styles.breathPhase}>{breathPhase}</div>
              <div className={styles.breathCaption}>4-7-8 · mentre aspetti</div>
            </div>
            <div className={styles.statusBox}>
              <div className={styles.statusChip}>
                {sos.stato === "presa_in_carico" ? "presa in carico · eta" : "aperta · telegram ✓"}
              </div>
              <div className={styles.statusText}>
                {sos.stato === "presa_in_carico"
                  ? `Arriva tra ${formatMmSs(etaLeftSec)}`
                  : "Lei ha ricevuto il messaggio."}
              </div>
              <div className={styles.statusMeta}>
                {sos.stato === "presa_in_carico"
                  ? `ha premuto "tra ${sos.eta_minuti} minuti"`
                  : `nuovo SOS possibile tra ${formatMmSs(debounceLeftSec)}`}
              </div>
            </div>
          </div>
          <div className={styles.remedies}>
            <div className={styles.remedy}>Poi: tre stretch per il collo, lenti.</div>
            <div className={styles.remedy}>Poi: venti secondi a guardare fuori dalla finestra.</div>
            <button className={styles.doneButton} onClick={closeOverlay}>
              Sto meglio
            </button>
          </div>
        </>
      )}
    </div>
  );
}
