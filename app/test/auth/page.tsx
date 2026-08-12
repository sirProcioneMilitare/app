"use client";

import { useState } from "react";

export default function AuthTestPage() {
  const [passphrase, setPassphrase] = useState("");
  const [output, setOutput] = useState<string>("");

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = await res.json().catch(() => null);
    setOutput(`${res.status}\n${JSON.stringify(body, null, 2)}`);
  }

  return (
    <main>
      <h1>Test: Auth</h1>

      <section>
        <h2>POST /api/auth/login</h2>
        <input
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="passphrase"
        />
        <button
          onClick={() =>
            call("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ passphrase }),
            })
          }
        >
          Login
        </button>
      </section>

      <section>
        <h2>POST /api/auth/logout</h2>
        <button onClick={() => call("/api/auth/logout", { method: "POST" })}>
          Logout
        </button>
      </section>

      <section>
        <h2>GET /api/auth/me</h2>
        <button onClick={() => call("/api/auth/me")}>Chi sono</button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
