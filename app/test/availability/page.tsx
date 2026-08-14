"use client";

import { useState } from "react";

export default function AvailabilityTestPage() {
  const [output, setOutput] = useState("");
  const [disponibile, setDisponibile] = useState(true);
  const [messaggio, setMessaggio] = useState("");

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
      <h1>Test: Disponibilità</h1>

      <section>
        <h2>GET /api/availability</h2>
        <button onClick={() => call("/api/availability")}>Leggi</button>
      </section>

      <section>
        <h2>PUT /api/availability</h2>
        <label>
          <input
            type="checkbox"
            checked={disponibile}
            onChange={(e) => setDisponibile(e.target.checked)}
          />
          disponibile
        </label>
        <input
          placeholder="messaggio (opzionale)"
          value={messaggio}
          onChange={(e) => setMessaggio(e.target.value)}
        />
        <button
          onClick={() =>
            call("/api/availability", {
              method: "PUT",
              body: JSON.stringify({ disponibile, messaggio: messaggio || null }),
            })
          }
        >
          Aggiorna (solo her)
        </button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
