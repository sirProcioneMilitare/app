"use client";

import { useEffect, useState } from "react";
import { getRedemptions, getRewards, redeemReward } from "@/lib/client/endpoints";
import type { Redemption, Reward } from "@/lib/client/types";
import styles from "./buoni.module.css";

const PLAYLISTS = [
  { title: "Focus", meta: "niente voci · 2h 10m", color: "repeating-linear-gradient(90deg,#DDD7C9 0 4px,#EAE5D9 4px 8px)" },
  { title: "Decompressione post-call", meta: "per i 6 minuti dopo · 22m", color: "repeating-linear-gradient(90deg,#E3CFC7 0 4px,#EFE0D9 4px 8px)" },
  { title: "Sabato mattina", meta: "con le galline sullo sfondo · 1h", color: "repeating-linear-gradient(90deg,#D5E0D3 0 4px,#E4EBE1 4px 8px)" },
];

export default function BuoniPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  function refresh() {
    Promise.all([getRewards(), getRedemptions()])
      .then(([r, red]) => {
        setRewards(r.rewards);
        setRedemptions(red.redemptions);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRedeem(id: string) {
    setPending(id);
    try {
      await redeemReward(id);
      refresh();
    } catch {
      refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.title}>Buoni</div>

      {!loading &&
        rewards.map((r) => {
          const perQuestoReward = redemptions.filter((x) => x.reward_id === r.id);
          const inAttesa = perQuestoReward.find((x) => x.stato === "richiesto");
          const usati = perQuestoReward.filter((x) => x.stato !== "scaduto").length;
          const esaurito = r.usi_massimi !== null && usati >= r.usi_massimi;
          const onorati = perQuestoReward.filter((x) => x.stato === "onorato").length;

          let meta: string;
          let label: string;
          let disabled = false;
          if (inAttesa) {
            meta = "riscattato · in attesa che lei lo onori";
            label = "in corso";
            disabled = true;
          } else if (esaurito) {
            meta = onorati > 0 ? "usato" : "esaurito";
            label = onorati > 0 ? "fatto" : "esaurito";
            disabled = true;
          } else {
            meta = r.usi_massimi === 1 ? "un solo uso disponibile" : "sempre disponibile";
            label = "riscatta";
          }

          return (
            <div key={r.id} className={`${styles.rewardCard} ${disabled ? styles.dimmed : ""}`}>
              <div className={styles.rewardBody}>
                <div className={`${styles.rewardTitolo} ${esaurito && onorati > 0 ? styles.doneDeco : ""}`}>
                  {r.titolo}
                </div>
                {r.descrizione && <div className={styles.rewardDesc}>{r.descrizione}</div>}
                <div className={styles.rewardMeta}>{meta}</div>
              </div>
              <button
                className={styles.rewardButton}
                disabled={disabled || pending === r.id}
                onClick={() => handleRedeem(r.id)}
                style={{
                  background: disabled ? "var(--oss-paper-2)" : "var(--oss-giallo)",
                  color: disabled ? "var(--oss-testo-terziario)" : "var(--oss-ink)",
                }}
              >
                {pending === r.id ? "..." : label}
              </button>
            </div>
          );
        })}

      <div className={styles.playlistCard}>
        <div className={styles.playlistLabel}>playlist per fase</div>
        {PLAYLISTS.map((p) => (
          <div key={p.title} className={styles.playlistRow}>
            <div className={styles.playlistDot} style={{ background: p.color }} />
            <div className={styles.playlistBody}>
              <div className={styles.playlistTitle}>{p.title}</div>
              <div className={styles.playlistMeta}>{p.meta}</div>
            </div>
            <div className={styles.spotifyLabel}>SPOTIFY</div>
          </div>
        ))}
      </div>
    </div>
  );
}
