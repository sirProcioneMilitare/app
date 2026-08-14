"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/client/endpoints";
import type { Me } from "@/lib/client/types";
import styles from "./app-shell.module.css";

const TABS = [
  { href: "/calendario", label: "CALENDARIO", icon: "🗓" },
  { href: "/prenota", label: "PRENOTA", icon: "➕" },
];

const MeContext = createContext<Me | null>(null);

export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe deve stare dentro <AppShell>");
  return me;
}

export function AppShell({ me, children }: { me: Me; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <MeContext.Provider value={me}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.wordmarkRow}>
            <div className={styles.wordmark}>Ganzelli Calendar</div>
            <div className={styles.chi}>
              {me.nome} · con {me.altro.nome}
            </div>
          </div>
          <button className={styles.exitBtn} onClick={handleLogout}>
            esci
          </button>
        </header>

        <main className={styles.main}>{children}</main>

        <nav className={styles.tabBar}>
          {TABS.map((t) => {
            const active = pathname?.startsWith(t.href) ?? false;
            return (
              <Link key={t.href} href={t.href} className={styles.tabButton}>
                <div className={`${styles.tabIcon} ${active ? styles.active : ""}`}>
                  {t.icon}
                </div>
                <div className={`${styles.tabLabel} ${active ? styles.active : ""}`}>
                  {t.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </MeContext.Provider>
  );
}
