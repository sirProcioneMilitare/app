"use client";

import { useState } from "react";

export default function RewardsTestPage() {
  const [output, setOutput] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [redemptionId, setRedemptionId] = useState("");

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
      <h1>Test: Buoni</h1>

      <section>
        <h2>GET /api/rewards</h2>
        <button onClick={() => call("/api/rewards")}>Elenca buoni</button>
      </section>

      <section>
        <h2>POST /api/rewards/:id/redeem</h2>
        <input
          placeholder="reward id"
          value={rewardId}
          onChange={(e) => setRewardId(e.target.value)}
        />
        <button
          onClick={() => call(`/api/rewards/${rewardId}/redeem`, { method: "POST" })}
        >
          Riscatta
        </button>
      </section>

      <section>
        <h2>GET /api/redemptions</h2>
        <button onClick={() => call("/api/redemptions")}>Elenca riscatti</button>
      </section>

      <section>
        <h2>PATCH /api/redemptions/:id</h2>
        <input
          placeholder="redemption id"
          value={redemptionId}
          onChange={(e) => setRedemptionId(e.target.value)}
        />
        <button
          onClick={() =>
            call(`/api/redemptions/${redemptionId}`, {
              method: "PATCH",
              body: JSON.stringify({ stato: "onorato" }),
            })
          }
        >
          Onora (solo her)
        </button>
      </section>

      <pre>{output}</pre>
      <p>
        <a href="/">Torna all'indice</a>
      </p>
    </main>
  );
}
