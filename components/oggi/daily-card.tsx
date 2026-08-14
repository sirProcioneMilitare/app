"use client";

import { useEffect, useRef, useState } from "react";
import { getDaily, markDailyListened } from "@/lib/client/endpoints";
import type { DailyDrop } from "@/lib/client/types";
import styles from "./daily-card.module.css";

/**
 * Il contenuto lasciato da lei per oggi. GET /api/daily risponde 404 finche'
 * non e' sbloccato (per lui: solo dopo le 08:30 di Roma), e in quel caso la
 * card non viene proprio renderizzata: niente contenitori vuoti.
 */
export function DailyCard() {
  const [drops, setDrops] = useState<DailyDrop[] | null>(null);
  const segnati = useRef<Set<string>>(new Set());

  function segnaAscoltato(id: string) {
    if (segnati.current.has(id)) return;
    segnati.current.add(id);
    markDailyListened(id).catch(() => {
      segnati.current.delete(id);
    });
  }

  useEffect(() => {
    getDaily()
      .then((res) => {
        setDrops(res);
        // Un drop di testo si considera visto appena viene mostrato; per
        // l'audio si aspetta il play.
        res
          ?.filter((d) => d.tipo === "testo" && !d.ascoltato_at)
          .forEach((d) => segnaAscoltato(d.id));
      })
      .catch(() => setDrops(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!drops || drops.length === 0) return null;

  return (
    <>
      {drops.map((d) => (
        <div key={d.id} className={styles.card}>
          <div className={styles.label}>8:30 · da lei</div>

          {d.tipo === "testo" && d.contenuto_testo && (
            <div className={styles.testo}>{d.contenuto_testo}</div>
          )}

          {d.tipo === "audio" &&
            (d.audio_url ? (
              <audio
                className={styles.player}
                controls
                src={d.audio_url}
                onPlay={() => segnaAscoltato(d.id)}
              />
            ) : (
              <div className={styles.meta}>Audio non disponibile in questo momento.</div>
            ))}

          {d.ascoltato_at && <div className={styles.meta}>gia' ascoltato</div>}
        </div>
      ))}
    </>
  );
}
