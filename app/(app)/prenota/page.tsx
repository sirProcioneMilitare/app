"use client";

import { useEffect, useState } from "react";
import { getBookings, getServices } from "@/lib/client/endpoints";
import type { Booking, BookingStato, ServiceType } from "@/lib/client/types";
import { formatBookingWhen } from "@/lib/client/format";
import { serviceStripe } from "@/lib/client/service-style";
import { BookingSheet } from "@/components/prenota/booking-sheet";
import styles from "./prenota.module.css";

const STATO_STYLE: Record<BookingStato, { bg: string; fg: string; label: string }> = {
  richiesta: { bg: "var(--oss-giallo)", fg: "var(--oss-ink)", label: "richiesta" },
  confermata: { bg: "var(--oss-verde)", fg: "#fff", label: "confermata" },
  rifiutata: { bg: "var(--oss-card-muted)", fg: "var(--oss-testo-terziario)", label: "rifiutata" },
  completata: { bg: "var(--oss-ink)", fg: "var(--oss-paper)", label: "completata" },
  annullata: { bg: "var(--oss-card-muted)", fg: "var(--oss-testo-terziario)", label: "annullata" },
};

export default function PrenotaPage() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

  function refresh() {
    Promise.all([getServices(), getBookings()])
      .then(([svc, bk]) => {
        setServices(svc.services);
        setBookings(bk.bookings.filter((b) => b.stato !== "annullata"));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className={styles.stack}>
      <div className={styles.title}>Prenota con lei</div>

      {!loading && bookings.length > 0 && (
        <div className={styles.bookingsList}>
          <div className={styles.sectionLabel}>le tue prenotazioni</div>
          {bookings.map((b) => {
            const st = STATO_STYLE[b.stato];
            const nota =
              b.nota_risposta ?? (b.stato === "richiesta" ? "In attesa che lei risponda." : b.nota_richiedente);
            return (
              <div key={b.id} className={styles.bookingRow}>
                <div className={styles.bookingEmoji}>{b.service_types?.emoji}</div>
                <div className={styles.bookingBody}>
                  <div className={styles.bookingNome}>{b.service_types?.nome}</div>
                  <div className={styles.bookingWhen}>{formatBookingWhen(b.inizio_at, b.fine_at)}</div>
                  {nota && <div className={styles.bookingNota}>{nota}</div>}
                </div>
                <div className={styles.bookingChip} style={{ background: st.bg, color: st.fg }}>
                  {st.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.catalog}>
        {services.map((s) => (
          <button key={s.id} className={styles.serviceCard} onClick={() => setSelectedService(s)}>
            <div className={styles.serviceStripe} style={{ backgroundImage: serviceStripe(s.slug) }}>
              <div className={styles.serviceEmoji}>{s.emoji}</div>
              <div className={styles.serviceDur}>{s.durata_minuti} MIN</div>
            </div>
            <div className={styles.serviceBody}>
              <div className={styles.serviceNome}>{s.nome}</div>
              <div className={styles.serviceDesc}>{s.descrizione}</div>
              <div className={styles.serviceRule}>
                {s.richiede_anticipo_ore
                  ? `richiede ${s.richiede_anticipo_ore}h di anticipo`
                  : "prenotabile anche adesso"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedService && (
        <BookingSheet
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onBooked={refresh}
        />
      )}
    </div>
  );
}
