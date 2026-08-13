"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setErrore(body?.error?.message ?? "Errore di accesso.");
        setCaricamento(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrore("Impossibile contattare il server.");
      setCaricamento(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Ossigeno</h1>
        <p className={styles.subtitle}>Inserisci la tua passphrase.</p>
        <input
          className={styles.input}
          type="password"
          autoFocus
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="passphrase"
        />
        <button className={styles.button} type="submit" disabled={caricamento || !passphrase}>
          {caricamento ? "..." : "Entra"}
        </button>
        {errore && <p className={styles.error}>{errore}</p>}
      </form>
    </main>
  );
}
