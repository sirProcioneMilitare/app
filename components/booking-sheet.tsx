"use client";

import { useEffect, useState } from "react";
import { ApiClientError, createEvent, getSlots } from "@/lib/client/endpoints";
import type { ActivityType } from "@/lib/client/types";
import { formatGiorno, formatOra, giorniProssimi } from "@/lib/client/format";
import { useMe } from "./app-shell";
import styles from "./booking-sheet.module.css";

const GIORNI_SELEZIONABILI = 14;

export function BookingSheet({
  activity,
  onClose,
  onCreated,
}: {
  activity: ActivityType;
  onClose: () => void;
  onCreated: () => void;
}) {
  const me = useMe();
  const giorni = giorniProssimi(GIORNI_SELEZIONABILI);
  const [giorno, setGiorno] = useState<string>(giorni[0] ?? "");
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [nota, setNota] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [sending, setSending] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!giorno) return;
    setSlot(null);
    setLoadingSlots(true);
    getSlots(activity.slug, giorno)
      .then((res) => setSlots(res.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [activity.slug, giorno]);

  async function conferma() {
    if (!slot) return;
    setSending(true);
    setErrore(null);
    try {
      await createEvent({
        activity_slug: activity.slug,
        inizio_at: slot,
        nota: nota.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrore("Quest'orario si è appena occupato: scegline un altro.");
        setSlot(null);
        getSlots(activity.slug, giorno)
          .then((res) => setSlots(res.slots))
          .catch(() => {});
      } else {
        setErrore(err instanceof Error ? err.message : "Errore imprevisto.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.head}>
          <div className={styles.headEmoji}>{activity.emoji}</div>
          <div>
            <div className={styles.headNome}>{activity.nome}</div>
            <div className={styles.headMeta}>
              {activity.durata_minuti} min ·{" "}
              {activity.insieme ? "insieme" : "impegno personale"}
            </div>
          </div>
        </div>

        <div className={styles.spiega}>
          {activity.insieme
            ? `Parte un invito: comparirà sul calendario di entrambi solo se ${me.altro.nome} accetta.`
            : `Va dritto sul calendario condiviso: ${me.altro.nome} lo vedrà, senza dover accettare.`}
        </div>

        <div className={styles.giorniRow}>
          {giorni.map((g) => (
            <button
              key={g}
              className={`${styles.giornoButton} ${giorno === g ? styles.selected : ""}`}
              onClick={() => setGiorno(g)}
            >
              {formatGiorno(g)}
            </button>
          ))}
        </div>

        <div className={styles.slotLabel}>orari liberi · 07:00–23:00</div>

        {loadingSlots ? (
          <div className={styles.vuoto}>Carico...</div>
        ) : slots.length === 0 ? (
          <div className={styles.vuoto}>
            Nessun orario libero per {formatGiorno(giorno)}
            {activity.insieme
              ? ": serve una finestra in cui siete liberi entrambi."
              : "."}
          </div>
        ) : (
          <div className={styles.slotGrid}>
            {slots.map((s) => (
              <button
                key={s}
                className={`${styles.slotButton} ${slot === s ? styles.selected : ""}`}
                onClick={() => setSlot(s)}
              >
                {formatOra(s)}
              </button>
            ))}
          </div>
        )}

        <input
          className={styles.nota}
          placeholder="due parole (facoltativo)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

        {errore && <div className={styles.errore}>{errore}</div>}

        <button
          className={`${styles.cta} ${slot ? styles.ready : ""}`}
          disabled={!slot || sending}
          onClick={conferma}
        >
          {sending
            ? "Invio..."
            : !slot
              ? "Scegli un orario"
              : activity.insieme
                ? "Manda l'invito"
                : "Metti in calendario"}
        </button>
        <button className={styles.annulla} onClick={onClose}>
          Annulla
        </button>
      </div>
    </div>
  );
}
