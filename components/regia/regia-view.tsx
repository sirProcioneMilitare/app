"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAvailability,
  getBookings,
  getRedemptions,
  honorRedemption,
  logout,
  respondBooking,
  setAvailability,
} from "@/lib/client/endpoints";
import type { Availability, Booking, Redemption } from "@/lib/client/types";
import { formatBookingWhen } from "@/lib/client/format";
import { DailyRecorder } from "./daily-recorder";
import styles from "./regia-view.module.css";

export function RegiaView() {
  const router = useRouter();
  const [avail, setAvail] = useState<Availability | null>(null);
  const [messaggio, setMessaggio] = useState("");
  const [pending, setPending] = useState<Booking[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    getAvailability().then((res) => {
      setAvail(res.availability);
      setMessaggio(res.availability.messaggio ?? "");
    });
    getBookings({ stato: "richiesta" }).then((res) => setPending(res.bookings));
    getRedemptions().then((res) => setRedemptions(res.redemptions));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleAvail() {
    if (!avail) return;
    const nuovo = !avail.disponibile;
    setAvail({ ...avail, disponibile: nuovo });
    await setAvailability(nuovo, messaggio || null);
    refresh();
  }

  async function salvaMessaggio() {
    if (!avail) return;
    await setAvailability(avail.disponibile, messaggio || null);
    refresh();
  }

  async function rispondi(id: string, stato: "confermata" | "rifiutata") {
    setBusyId(id);
    try {
      await respondBooking(
        id,
        stato,
        stato === "confermata" ? "Ci sono. Preparo tutto." : "Non oggi. Riproviamo domani?"
      );
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onora(id: string) {
    setBusyId(id);
    try {
      await honorRedemption(id);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const daOnorare = redemptions.filter((r) => r.stato === "richiesto");

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <div>
          <div className={styles.sessionLabel}>sessione · her</div>
          <div className={styles.title}>Regia</div>
        </div>
        <button className={styles.exitButton} onClick={handleLogout}>
          Esci
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.label}>disponibile per SOS livello 3</div>
          <div className={styles.toggleRow}>
            <button
              className={styles.toggle}
              onClick={toggleAvail}
              style={{
                justifyContent: avail?.disponibile ? "flex-end" : "flex-start",
                background: avail?.disponibile ? "var(--oss-verde)" : "var(--oss-card-muted)",
              }}
            >
              <div className={styles.toggleKnob} />
            </button>
            <div className={styles.toggleText}>
              {avail?.disponibile ? "Disponibile" : "Non disponibile"}
            </div>
          </div>
          <input
            className={styles.msgInput}
            placeholder="messaggio (es. sono in palestra fino alle 19)"
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            onBlur={salvaMessaggio}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.label}>richieste da evadere</div>
          {pending.length === 0 ? (
            <div className={styles.emptyHint}>Niente in sospeso.</div>
          ) : (
            pending.map((b) => (
              <div key={b.id} className={styles.pendingItem}>
                <div className={styles.pendingNome}>
                  {b.service_types?.emoji} {b.service_types?.nome}
                </div>
                <div className={styles.pendingWhen}>{formatBookingWhen(b.inizio_at, b.fine_at)}</div>
                <div className={styles.pendingActions}>
                  <button
                    className={styles.confirmButton}
                    disabled={busyId === b.id}
                    onClick={() => rispondi(b.id, "confermata")}
                  >
                    Confermo
                  </button>
                  <button
                    className={styles.rejectButton}
                    disabled={busyId === b.id}
                    onClick={() => rispondi(b.id, "rifiutata")}
                  >
                    Rifiuto
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.label}>buoni riscattati</div>
          {daOnorare.length === 0 ? (
            <div className={styles.emptyHint}>Niente da onorare.</div>
          ) : (
            daOnorare.map((r) => (
              <div key={r.id} className={styles.redemptionRow}>
                <div className={styles.redemptionBody}>
                  <div className={styles.redemptionTitolo}>{r.rewards?.titolo}</div>
                  <div className={styles.redemptionMeta}>
                    richiesto · {new Date(r.riscattato_at).toLocaleDateString("it-IT")}
                  </div>
                </div>
                <button
                  className={styles.honorButton}
                  disabled={busyId === r.id}
                  onClick={() => onora(r.id)}
                >
                  Onora
                </button>
              </div>
            ))
          )}
        </div>

        <DailyRecorder />
      </main>
    </div>
  );
}
