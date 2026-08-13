"use client";

import { useEffect, useState } from "react";
import { todayInRome } from "@/lib/time";
import styles from "./shutdown.module.css";

const STEPS = [
  "Via il telefono di lavoro",
  "Chiudi le chat sul pc",
  "Togli le cuffie e mettile lontano.",
];

function storageKey() {
  return `oss-shutdown-${todayInRome()}`;
}

function loadState(): { done: boolean[]; closed: boolean } {
  if (typeof window === "undefined") return { done: [false, false, false], closed: false };
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return { done: [false, false, false], closed: false };
    return JSON.parse(raw);
  } catch {
    return { done: [false, false, false], closed: false };
  }
}

export function ShutdownRitual() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const s = loadState();
    setDone(s.done);
    setClosed(s.closed);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(), JSON.stringify({ done, closed }));
  }, [done, closed]);

  const doneCount = done.filter(Boolean).length;
  const allDone = doneCount === STEPS.length;

  function toggleStep(i: number) {
    setDone((d) => {
      const next = d.slice();
      next[i] = !next[i];
      return next;
    });
  }

  function handleClose() {
    if (allDone) setClosed(true);
    setOverlayOpen(false);
  }

  return (
    <>
      <button className={styles.teaserButton} onClick={() => setOverlayOpen(true)}>
        <div className={styles.teaserRow}>
          <div>
            <div className={styles.teaserLabel}>18:00 · shutdown</div>
            <div className={styles.teaserText}>
              {closed
                ? "Giornata chiusa."
                : "Il tuo rituale di chiusura lavoro, e poi liberi la mente"}
            </div>
          </div>
          <div className={styles.teaserProgress}>{doneCount}/3</div>
        </div>
      </button>

      {overlayOpen && (
        <div className={styles.overlay}>
          <div className={styles.overlayLabel}>18:00 · rituale di chiusura</div>
          <div className={styles.overlayTitle}>{allDone ? "Fatto. Si chiude." : "Ci sei quasi!"}</div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(doneCount / 3) * 100}%` }} />
          </div>

          <div className={styles.steps}>
            {STEPS.map((text, i) => (
              <button
                key={text}
                className={`${styles.step} ${done[i] ? styles.done : ""}`}
                onClick={() => toggleStep(i)}
              >
                <span className={`${styles.stepMark} ${done[i] ? styles.done : ""}`}>
                  {done[i] ? "✓" : ""}
                </span>
                <span>{text}</span>
              </button>
            ))}

            <div className={styles.spacer} />

            {allDone ? (
              <div className={styles.closedBox}>
                <div className={styles.closedTitle}>Giornata chiusa</div>
                <div className={styles.closedMeta}>ci si rivede alle 8:30</div>
              </div>
            ) : (
              <div className={styles.openHint}>
                Finche' non spunti tutto, la giornata resta aperta. L'app lo sa.
              </div>
            )}
          </div>

          <button
            className={`${styles.closeButton} ${allDone ? styles.allDone : styles.notDone}`}
            onClick={handleClose}
          >
            {allDone ? "Chiudi la giornata" : "Non ancora"}
          </button>
        </div>
      )}
    </>
  );
}
