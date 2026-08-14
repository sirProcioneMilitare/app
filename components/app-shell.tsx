"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMoodHistory, logout } from "@/lib/client/endpoints";
import { computeMoodStreak } from "@/lib/client/streak";
import { ROME_TZ } from "@/lib/time";
import { SosProvider } from "./sos-context";
import { SosOverlay } from "./sos-overlay";
import styles from "./app-shell.module.css";

const TABS = [
  { href: "/oggi", label: "OGGI", icon: "☀" },
  { href: "/prenota", label: "PRENOTA", icon: "📅" },
  { href: "/sollievo", label: "SOLLIEVO", icon: "🫁" },
  { href: "/buoni", label: "BUONI", icon: "🎟" },
];

function useClock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: ROME_TZ,
    });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clock = useClock();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    getMoodHistory(60)
      .then((res) => setStreak(computeMoodStreak(res.mood_logs)))
      .catch(() => setStreak(null));
  }, []);

  async function handleLogout() {
    await logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <SosProvider>
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.wordmarkRow}>
            <div className={styles.wordmark}>Ossigeno</div>
            {streak !== null && streak > 0 && (
              <div className={styles.streakBadge}>SERIE {streak}</div>
            )}
          </div>
          <div className={styles.clock}>{clock}</div>
          <button className={styles.exitBtn} onClick={handleLogout} title="Esci">
            esci
          </button>
        </header>

        <main className={styles.main}>{children}</main>

        <nav className={styles.tabBar}>
          {TABS.map((t) => {
            const active = pathname?.startsWith(t.href) ?? false;
            return (
              <Link key={t.href} href={t.href} className={styles.tabButton}>
                <div className={`${styles.tabIcon} ${active ? styles.active : ""}`}>{t.icon}</div>
                <div className={`${styles.tabLabel} ${active ? styles.active : ""}`}>{t.label}</div>
              </Link>
            );
          })}
        </nav>

        <SosOverlay />
      </div>
    </SosProvider>
  );
}
