"use client";

import { useEffect, useState } from "react";
import styles from "./breath-overlay.module.css";

export function BreathOverlay({ onClose }: { onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const bp = elapsed % 19;
  const phase = bp < 4 ? "Inspira" : bp < 11 ? "Trattieni" : "Espira";
  const count = bp < 4 ? 4 - bp : bp < 11 ? 11 - bp : 19 - bp;
  const cycle = (Math.floor(elapsed / 19) % 3) + 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.circleOuter}>
        <div className={styles.count}>{count}</div>
      </div>
      <div className={styles.phase}>{phase}</div>
      <div className={styles.cycle}>ciclo {cycle} di 3</div>
      <button className={styles.closeButton} onClick={onClose}>
        Basta cosi'
      </button>
    </div>
  );
}
