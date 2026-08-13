"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAvailability } from "@/lib/client/endpoints";
import type { Availability } from "@/lib/client/types";
import { useSos } from "@/components/sos-context";
import { BreathOverlay } from "@/components/sollievo/breath-overlay";
import { PollaioOverlay } from "@/components/sollievo/pollaio-overlay";
import styles from "./sollievo.module.css";

export default function SollievoPage() {
  const { openOverlay } = useSos();
  const [breathOpen, setBreathOpen] = useState(false);
  const [pollaioOpen, setPollaioOpen] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);

  useEffect(() => {
    getAvailability()
      .then((res) => setAvail(res.availability))
      .catch(() => setAvail(null));
  }, []);

  return (
    <div className={styles.stack}>
      <div className={styles.title}>One Hand</div>
      <div className={styles.subtitle}>Cose che puoi fare con una mano sola mentre sei in call 😏</div>

      <button className={styles.sosButton} onClick={openOverlay}>
        <div className={styles.sosTitle}>Sto per esplodere</div>
        <div className={styles.sosSub}>Tre livelli, un messaggio su Telegram, un rimedio subito.</div>
      </button>

      <div className={styles.grid2}>
        <Link href="/sollievo/bingo" className={`${styles.tileButton} ${styles.ink}`}>
          <div className={styles.tileIcon}>🎯</div>
          <div className={styles.tileTitle}>Bingo delle call</div>
          <div className={styles.tileMeta}>una riga vince</div>
        </Link>
        <button className={`${styles.tileButton} ${styles.verde}`} onClick={() => setPollaioOpen(true)}>
          <div className={styles.tileIcon}>🐔</div>
          <div className={styles.tileTitle}>Dose di pollaio</div>
          <div className={styles.tileMeta}>una foto a caso</div>
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardLabel}>respirazione 4-7-8</div>
        <div className={styles.cardText}>
          Tre cicli, cinquantasette secondi. Si puo' fare mentre qualcuno condivide lo schermo.
        </div>
        <button className={styles.startButton} onClick={() => setBreathOpen(true)}>
          Inizia
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardLabel}>disponibilita' di lei</div>
        <div className={styles.availRow}>
          <div
            className={styles.availDot}
            style={{ background: avail?.disponibile ? "var(--oss-verde)" : "var(--oss-rosso)" }}
          />
          <div className={styles.availText}>
            {avail === null ? "..." : avail.disponibile ? "Disponibile" : "Non disponibile"}
          </div>
        </div>
        {avail?.messaggio && <div className={styles.availMsg}>{avail.messaggio}</div>}
      </div>

      {breathOpen && <BreathOverlay onClose={() => setBreathOpen(false)} />}
      {pollaioOpen && <PollaioOverlay onClose={() => setPollaioOpen(false)} />}
    </div>
  );
}
