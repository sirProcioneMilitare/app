"use client";

import { useState } from "react";

export default function PushTestPage() {
  const [output, setOutput] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [p256dh, setP256dh] = useState("");
  const [auth, setAuth] = useState("");

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
      <h1>Test: Push</h1>
      <p>
        Campi da compilare a mano con i valori di una vera PushSubscription
        del browser (endpoint, keys.p256dh, keys.auth), per verificare che
        gli endpoint salvino/cancellino correttamente.
      </p>

      <section>
        <h2>POST /api/push/subscribe</h2>
        <input
          placeholder="endpoint"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
        />
        <input
          placeholder="p256dh"
          value={p256dh}
          onChange={(e) => setP256dh(e.target.value)}
        />
        <input
          placeholder="auth"
          value={auth}
          onChange={(e) => setAuth(e.target.value)}
        />
        <button
          onClick={() =>
            call("/api/push/subscribe", {
              method: "POST",
              body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
            })
          }
        >
          Iscrivi
        </button>
        <button
          onClick={() =>
            call("/api/push/subscribe", {
              method: "DELETE",
              body: JSON.stringify({ endpoint }),
            })
          }
        >
          Disiscrivi
        </button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
