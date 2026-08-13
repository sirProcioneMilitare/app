"use client";

import { useEffect, useState } from "react";
import { ApiClientError, createBooking, getSlots } from "@/lib/client/endpoints";
import type { ServiceType } from "@/lib/client/types";
import { dateInRome, ROME_TZ } from "@/lib/time";
import styles from "./booking-sheet.module.css";

function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ROME_TZ,
  }).format(new Date(iso));
}

export function BookingSheet({
  service,
  onClose,
  onBooked,
}: {
  service: ServiceType;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [day, setDay] = useState<"oggi" | "domani">(
    service.richiede_anticipo_ore ? "domani" : "oggi"
  );
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const giorno =
    day === "oggi" ? dateInRome(new Date()) : dateInRome(new Date(Date.now() + 86400000));

  useEffect(() => {
    setSlot(null);
    setLoadingSlots(true);
    getSlots(service.slug, giorno)
      .then((res) => setSlots(res.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [service.slug, giorno]);

  async function handleConfirm() {
    if (!slot) return;
    setSending(true);
    setError(null);
    try {
      await createBooking({ service_slug: service.slug, inizio_at: slot });
      onBooked();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setError("Questo slot non e' piu' disponibile: scegline un altro.");
        setSlot(null);
        getSlots(service.slug, giorno)
          .then((res) => setSlots(res.slots))
          .catch(() => {});
      } else {
        setError(err instanceof Error ? err.message : "Errore imprevisto.");
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
          <div className={styles.headEmoji}>{service.emoji}</div>
          <div>
            <div className={styles.headNome}>{service.nome}</div>
            <div className={styles.headSlug}>
              {service.slug} · {service.durata_minuti} min
            </div>
          </div>
        </div>
        <div className={styles.desc}>{service.descrizione}</div>

        <div className={styles.dayRow}>
          <button
            className={`${styles.dayButton} ${day === "oggi" ? styles.selected : ""}`}
            onClick={() => setDay("oggi")}
          >
            Oggi
          </button>
          <button
            className={`${styles.dayButton} ${day === "domani" ? styles.selected : ""}`}
            onClick={() => setDay("domani")}
          >
            Domani
          </button>
        </div>

        <div className={styles.slotLabel}>
          {service.richiede_anticipo_ore
            ? `anticipo di ${service.richiede_anticipo_ore}h · slot liberi 07:00-22:00`
            : "slot liberi · 07:00-22:00"}
        </div>

        {loadingSlots ? (
          <div className={styles.emptySlots}>Carico...</div>
        ) : slots.length === 0 ? (
          <div className={styles.emptySlots}>
            Nessuno slot libero per {day === "oggi" ? "oggi" : "domani"}
            {service.richiede_anticipo_ore ? " (anche per via dell'anticipo richiesto)" : ""}.
          </div>
        ) : (
          <div className={styles.slotGrid}>
            {slots.map((s) => (
              <button
                key={s}
                className={`${styles.slotButton} ${slot === s ? styles.selected : ""}`}
                onClick={() => setSlot(s)}
              >
                {formatSlotTime(s)}
              </button>
            ))}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button
          className={`${styles.cta} ${slot ? styles.ready : ""}`}
          disabled={!slot || sending}
          onClick={handleConfirm}
        >
          {sending ? "Invio..." : slot ? "Manda la richiesta" : "Scegli uno slot"}
        </button>
        <button className={styles.cancel} onClick={onClose}>
          Annulla
        </button>
      </div>
    </div>
  );
}
