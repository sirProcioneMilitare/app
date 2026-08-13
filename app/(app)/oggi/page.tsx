"use client";

import { useEffect, useState } from "react";
import { computeDayInfo } from "@/lib/client/day";
import { formatMmSs, useSos } from "@/components/sos-context";
import { MoodCard } from "@/components/oggi/mood-card";
import { ShutdownRitual } from "@/components/oggi/shutdown";
import styles from "./oggi.module.css";

function useDayInfo() {
  const [info, setInfo] = useState(() => computeDayInfo(new Date()));
  useEffect(() => {
    const id = setInterval(() => setInfo(computeDayInfo(new Date())), 30000);
    return () => clearInterval(id);
  }, []);
  return info;
}

export default function OggiPage() {
  const day = useDayInfo();
  const { active, openOverlay, debounceRimanentiSecondi, now } = useSos();

  const sos = active?.sos ?? null;
  const attivo = sos && (sos.stato === "aperta" || sos.stato === "presa_in_carico");

  const sosBadge = attivo ? "ATTIVO" : debounceRimanentiSecondi > 0 ? "PAUSA" : "PRONTO";

  let sosSub = "Tre livelli di spuntino in base alla gravita' della situazione";
  if (sos?.stato === "presa_in_carico" && sos.eta_minuti && sos.presa_in_carico_at) {
    const etaAt = new Date(sos.presa_in_carico_at).getTime() + sos.eta_minuti * 60000;
    sosSub = `Arriva tra ${formatMmSs(Math.max(0, Math.round((etaAt - now) / 1000)))}`;
  } else if (sos?.stato === "aperta") {
    sosSub = "Richiesta inviata, aspetta risposta.";
  } else if (debounceRimanentiSecondi > 0) {
    sosSub = `Nuovo SOS possibile tra ${formatMmSs(debounceRimanentiSecondi)}`;
  }

  return (
    <div className={styles.stack}>
      <div className={styles.countdownCard}>
        <div className={styles.countdownTopRow}>
          <div className={styles.countdownLabel}>fine giornata</div>
          <div className={styles.countdownLabel}>weekend</div>
        </div>
        <div className={styles.countdownNumbersRow}>
          <div className={styles.countdownNumber}>{day.endOfDayLabel}</div>
          <div className={`${styles.countdownNumber} ${styles.giallo}`}>{day.weekendInLabel}</div>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${day.dayPct}%` }} />
        </div>
        <div className={styles.dayLine}>{day.dayLine}</div>
      </div>

      <button className={styles.sosButton} onClick={openOverlay}>
        <div className={styles.sosTopRow}>
          <div className={styles.sosTitle}>SOS</div>
          <div className={styles.sosBadge}>{sosBadge}</div>
        </div>
        <div className={styles.sosSub}>{sosSub}</div>
      </button>

      <MoodCard />

      <ShutdownRitual />
    </div>
  );
}
