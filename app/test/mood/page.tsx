"use client";

import { useState } from "react";

export default function MoodTestPage() {
  const [output, setOutput] = useState("");
  const [valore, setValore] = useState("3");
  const [nota, setNota] = useState("");
  const [giorni, setGiorni] = useState("30");

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
      <h1>Test: Umore</h1>

      <section>
        <h2>POST /api/mood</h2>
        <select value={valore} onChange={(e) => setValore(e.target.value)}>
          {[1, 2, 3, 4, 5].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <input
          placeholder="nota (opzionale)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <button
          onClick={() =>
            call("/api/mood", {
              method: "POST",
              body: JSON.stringify({ valore: Number(valore), nota: nota || undefined }),
            })
          }
        >
          Registra umore
        </button>
      </section>

      <section>
        <h2>GET /api/mood</h2>
        <input
          placeholder="giorni"
          value={giorni}
          onChange={(e) => setGiorni(e.target.value)}
        />
        <button onClick={() => call(`/api/mood?giorni=${giorni}`)}>Storico</button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
