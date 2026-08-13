"use client";

import { useEffect, useState } from "react";
import { getMoodHistory, logMood } from "@/lib/client/endpoints";
import type { MoodLog } from "@/lib/client/types";
import { dateInRome } from "@/lib/time";
import styles from "./mood-card.module.css";

const FACES = ["😫", "😕", "😐", "🙂", "😄"] as const;
const GIORNI_LABEL = ["D", "L", "M", "M", "G", "V", "S"];
const QUATTRO_ORE_MS = 4 * 60 * 60 * 1000;

function formatOreMinuti(ms: number): string {
  const totMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totMin / 60);
  const m = totMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function MoodCard() {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const refresh = () =>
    getMoodHistory(30)
      .then((res) => setLogs(res.mood_logs))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const lastLog = logs[logs.length - 1] ?? null;
  const msFromLast = lastLog ? now - new Date(lastLog.registrato_at).getTime() : Infinity;
  const locked = msFromLast < QUATTRO_ORE_MS;

  async function pick(valore: 1 | 2 | 3 | 4 | 5) {
    if (locked || posting) return;
    setPosting(true);
    try {
      await logMood(valore);
      await refresh();
    } catch {
      await refresh();
    } finally {
      setPosting(false);
    }
  }

  // ultimi 7 giorni (oggi incluso), media umore per giorno.
  const oggi = new Date();
  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(oggi);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const bars = giorni.map((d) => {
    const chiave = dateInRome(d);
    const valoriGiorno = logs.filter((l) => dateInRome(l.registrato_at) === chiave).map((l) => l.valore);
    const media =
      valoriGiorno.length > 0 ? valoriGiorno.reduce((a, b) => a + b, 0) / valoriGiorno.length : null;
    const norm = media !== null ? (media - 1) / 4 : null;
    const heightPx = norm !== null ? Math.max(6, Math.round(norm * 46)) : 6;
    const color = norm === null ? "var(--oss-card-muted)" : norm < 0.35 ? "var(--oss-rosso)" : norm > 0.8 ? "var(--oss-verde)" : "var(--oss-giallo)";
    return { label: GIORNI_LABEL[d.getDay()], heightPx, color };
  });

  const loggedDays = new Set(logs.map((l) => dateInRome(l.registrato_at))).size;
  const insight =
    loggedDays < 3
      ? "Ancora poche registrazioni per un pattern."
      : (() => {
          const perGiorno: Record<number, number[]> = {};
          for (const l of logs) {
            const d = new Date(l.registrato_at).getDay();
            (perGiorno[d] ??= []).push(l.valore);
          }
          const medie = Object.entries(perGiorno).map(([d, vals]) => ({
            d: Number(d),
            media: vals.reduce((a, b) => a + b, 0) / vals.length,
          }));
          medie.sort((a, b) => a.media - b.media);
          const peggiore = medie[0];
          const nomi = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
          return peggiore ? `Il ${nomi[peggiore.d]} e' il giorno piu' giu', in media.` : "";
        })();

  return (
    <div className={styles.card}>
      <div className={styles.headRow}>
        <div className={styles.label}>umore</div>
        <div className={styles.lock}>
          {loading ? "" : locked ? `prossima tra ${formatOreMinuti(QUATTRO_ORE_MS - msFromLast)}` : "una ogni 4 ore"}
        </div>
      </div>
      <div className={styles.faces}>
        {FACES.map((face, i) => {
          const valore = (i + 1) as 1 | 2 | 3 | 4 | 5;
          const selected = lastLog && locked && lastLog.valore === valore;
          return (
            <button
              key={face}
              className={`${styles.faceButton} ${selected ? styles.selected : ""}`}
              disabled={locked || posting}
              onClick={() => pick(valore)}
            >
              {face}
            </button>
          );
        })}
      </div>
      <div className={styles.bars}>
        {bars.map((b, i) => (
          <div key={i} className={styles.barCol}>
            <div className={styles.bar} style={{ height: `${b.heightPx}px`, background: b.color }} />
            <div className={styles.barLabel}>{b.label}</div>
          </div>
        ))}
      </div>
      {insight && <div className={styles.insight}>{insight}</div>}
    </div>
  );
}
