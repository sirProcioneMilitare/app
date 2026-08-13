"use client";

import { useState } from "react";
import { bingoCellText, bingoHasLine } from "@/lib/client/bingo";
import styles from "./bingo.module.css";

export default function BingoPage() {
  const [marks, setMarks] = useState<Record<number, boolean>>({ 12: true });

  const win = bingoHasLine(marks);

  function toggle(i: number) {
    if (i === 12) return;
    setMarks((m) => ({ ...m, [i]: !m[i] }));
  }

  return (
    <div className={styles.stack}>
      <div className={styles.headRow}>
        <div className={styles.title}>Bingo delle call</div>
        <button className={styles.newButton} onClick={() => setMarks({ 12: true })}>
          Nuova
        </button>
      </div>

      <div className={styles.grid}>
        {Array.from({ length: 25 }, (_, i) => (
          <button
            key={i}
            className={`${styles.cell} ${marks[i] ? styles.marked : ""}`}
            onClick={() => toggle(i)}
          >
            {bingoCellText(i)}
          </button>
        ))}
      </div>

      <div className={`${styles.hint} ${win ? styles.win : ""}`}>
        {win
          ? "BINGO! Sopravvissuto alla call."
          : "Tappa mentre sei in call. Una riga, colonna o diagonale piena vince."}
      </div>
    </div>
  );
}
