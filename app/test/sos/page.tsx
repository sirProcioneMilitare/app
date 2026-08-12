"use client";

import { useState } from "react";

export default function SosTestPage() {
  const [output, setOutput] = useState("");
  const [livello, setLivello] = useState("1");
  const [nota, setNota] = useState("");
  const [mese, setMese] = useState("");

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
      <h1>Test: SOS</h1>

      <section>
        <h2>POST /api/sos</h2>
        <select value={livello} onChange={(e) => setLivello(e.target.value)}>
          <option value="1">1 - caffe' e biscotti</option>
          <option value="2">2 - spuntino salato</option>
          <option value="3">3 - intervento in presenza</option>
        </select>
        <input
          placeholder="nota (opzionale)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <button
          onClick={() =>
            call("/api/sos", {
              method: "POST",
              body: JSON.stringify({
                livello: Number(livello),
                nota: nota || undefined,
              }),
            })
          }
        >
          Manda SOS (solo him)
        </button>
      </section>

      <section>
        <h2>GET /api/sos/active</h2>
        <button onClick={() => call("/api/sos/active")}>SOS attivo</button>
      </section>

      <section>
        <h2>GET /api/sos/history</h2>
        <input
          placeholder="YYYY-MM"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
        />
        <button onClick={() => call(`/api/sos/history?mese=${mese}`)}>
          Storico mese
        </button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
