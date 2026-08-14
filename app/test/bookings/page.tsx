"use client";

import { useState } from "react";

export default function BookingsTestPage() {
  const [output, setOutput] = useState("");
  const [serviceSlug, setServiceSlug] = useState("yoga-insieme");
  const [giorno, setGiorno] = useState("");
  const [inizioAt, setInizioAt] = useState("");
  const [nota, setNota] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [statoFiltro, setStatoFiltro] = useState("");

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = await res.json().catch(() => null);
    setOutput(`${res.status} ${path}\n${JSON.stringify(body, null, 2)}`);
  }

  return (
    <main>
      <h1>Test: Prenotazioni</h1>

      <section>
        <h2>GET /api/services</h2>
        <button onClick={() => call("/api/services")}>Elenca servizi</button>
      </section>

      <section>
        <h2>GET /api/bookings</h2>
        <input
          placeholder="stato (opzionale)"
          value={statoFiltro}
          onChange={(e) => setStatoFiltro(e.target.value)}
        />
        <button
          onClick={() =>
            call(
              `/api/bookings${statoFiltro ? `?stato=${statoFiltro}` : ""}`
            )
          }
        >
          Elenca prenotazioni
        </button>
      </section>

      <section>
        <h2>GET /api/bookings/slots</h2>
        <input
          placeholder="service slug"
          value={serviceSlug}
          onChange={(e) => setServiceSlug(e.target.value)}
        />
        <input
          placeholder="YYYY-MM-DD"
          value={giorno}
          onChange={(e) => setGiorno(e.target.value)}
        />
        <button
          onClick={() =>
            call(`/api/bookings/slots?service=${serviceSlug}&giorno=${giorno}`)
          }
        >
          Slot liberi
        </button>
      </section>

      <section>
        <h2>POST /api/bookings</h2>
        <input
          placeholder="service slug"
          value={serviceSlug}
          onChange={(e) => setServiceSlug(e.target.value)}
        />
        <input
          placeholder="inizio_at ISO (es 2026-08-13T10:00:00+02:00)"
          value={inizioAt}
          onChange={(e) => setInizioAt(e.target.value)}
        />
        <input
          placeholder="nota (opzionale)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <button
          onClick={() =>
            call("/api/bookings", {
              method: "POST",
              body: JSON.stringify({
                service_slug: serviceSlug,
                inizio_at: inizioAt,
                nota_richiedente: nota || undefined,
              }),
            })
          }
        >
          Crea prenotazione
        </button>
      </section>

      <section>
        <h2>PATCH / DELETE /api/bookings/:id</h2>
        <input
          placeholder="booking id"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
        />
        <button
          onClick={() =>
            call(`/api/bookings/${bookingId}`, {
              method: "PATCH",
              body: JSON.stringify({ stato: "confermata" }),
            })
          }
        >
          Conferma (solo her)
        </button>
        <button
          onClick={() =>
            call(`/api/bookings/${bookingId}`, {
              method: "PATCH",
              body: JSON.stringify({ stato: "rifiutata" }),
            })
          }
        >
          Rifiuta (solo her)
        </button>
        <button
          onClick={() =>
            call(`/api/bookings/${bookingId}`, { method: "DELETE" })
          }
        >
          Annulla
        </button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
