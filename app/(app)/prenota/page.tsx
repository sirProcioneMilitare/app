"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActivities } from "@/lib/client/endpoints";
import type { ActivityType } from "@/lib/client/types";
import { BookingSheet } from "@/components/booking-sheet";
import { useMe } from "@/components/app-shell";
import styles from "./prenota.module.css";

export default function PrenotaPage() {
  const me = useMe();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [selected, setSelected] = useState<ActivityType | null>(null);

  useEffect(() => {
    getActivities()
      .then((res) => setActivities(res.activities))
      .catch(() => setActivities([]));
  }, []);

  const insieme = activities.filter((a) => a.insieme);
  const personali = activities.filter((a) => !a.insieme);

  function card(a: ActivityType) {
    return (
      <button
        key={a.id}
        className={`${styles.card} ${a.insieme ? styles.insieme : styles.personale}`}
        onClick={() => setSelected(a)}
      >
        <div className={styles.emoji}>{a.emoji}</div>
        <div className={styles.body}>
          <div className={styles.nome}>{a.nome}</div>
          {a.descrizione && <div className={styles.desc}>{a.descrizione}</div>}
          <div className={styles.meta}>
            {a.durata_minuti} min ·{" "}
            {a.insieme ? `invito a ${me.altro.nome}` : "solo tuo"}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.title}>Prenota</div>

      {insieme.length > 0 && (
        <>
          <div className={styles.sectionLabel}>insieme · serve un sì</div>
          {insieme.map(card)}
        </>
      )}

      {personali.length > 0 && (
        <>
          <div className={styles.sectionLabel}>i tuoi impegni</div>
          {personali.map(card)}
        </>
      )}

      {selected && (
        <BookingSheet
          activity={selected}
          onClose={() => setSelected(null)}
          onCreated={() => router.push("/calendario")}
        />
      )}
    </div>
  );
}
