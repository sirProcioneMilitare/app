"use client";

import { useState } from "react";

export default function DailyTestPage() {
  const [output, setOutput] = useState("");
  const [dropId, setDropId] = useState("");
  const [pubblicatoPer, setPubblicatoPer] = useState("");
  const [contenutoTesto, setContenutoTesto] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(path, init);
    const body = await res.json().catch(() => null);
    setOutput(`${res.status} ${path}\n${JSON.stringify(body, null, 2)}`);
  }

  async function callJson(path: string, init?: RequestInit) {
    return call(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  }

  return (
    <main>
      <h1>Test: Contenuti quotidiani</h1>

      <section>
        <h2>GET /api/daily</h2>
        <button onClick={() => call("/api/daily")}>Contenuto di oggi</button>
      </section>

      <section>
        <h2>POST /api/daily/:id/listened</h2>
        <input
          placeholder="drop id"
          value={dropId}
          onChange={(e) => setDropId(e.target.value)}
        />
        <button
          onClick={() => callJson(`/api/daily/${dropId}/listened`, { method: "POST" })}
        >
          Segna come ascoltato
        </button>
      </section>

      <section>
        <h2>POST /api/daily (solo her, multipart/form-data)</h2>
        <input
          placeholder="pubblicato_per YYYY-MM-DD"
          value={pubblicatoPer}
          onChange={(e) => setPubblicatoPer(e.target.value)}
        />
        <div>
          <textarea
            placeholder="contenuto_testo (per tipo=testo)"
            value={contenutoTesto}
            onChange={(e) => setContenutoTesto(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            const fd = new FormData();
            fd.set("tipo", "testo");
            fd.set("pubblicato_per", pubblicatoPer);
            fd.set("contenuto_testo", contenutoTesto);
            call("/api/daily", { method: "POST", body: fd });
          }}
        >
          Crea drop testo
        </button>
        <div>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          onClick={() => {
            const fd = new FormData();
            fd.set("tipo", "audio");
            fd.set("pubblicato_per", pubblicatoPer);
            if (file) fd.set("file", file);
            call("/api/daily", { method: "POST", body: fd });
          }}
        >
          Crea drop audio
        </button>
      </section>

      <section>
        <h2>GET /api/roost/random</h2>
        <button onClick={() => call("/api/roost/random")}>Foto casuale</button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
