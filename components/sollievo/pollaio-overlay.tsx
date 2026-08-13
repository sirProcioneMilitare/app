"use client";

import { useEffect, useState } from "react";
import { getRandomRoost } from "@/lib/client/endpoints";
import type { RoostMedia } from "@/lib/client/types";
import styles from "./pollaio-overlay.module.css";

export function PollaioOverlay({ onClose }: { onClose: () => void }) {
  const [media, setMedia] = useState<RoostMedia | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    getRandomRoost()
      .then(setMedia)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.label}>roost_media · random</div>
      <div className={styles.body}>
        {loading ? (
          <div className={styles.empty}>Carico...</div>
        ) : !media ? (
          <div className={styles.empty}>Ancora nessuna foto nel pollaio digitale.</div>
        ) : (
          <>
            <div
              className={styles.photoFrame}
              style={media.image_url ? { backgroundImage: `url(${media.image_url})` } : undefined}
            >
              <div className={styles.slotTag}>foto del pollaio</div>
            </div>
            {media.didascalia && <div className={styles.caption}>{media.didascalia}</div>}
            <div className={styles.count}>mostrata {media.mostrata_count} volte</div>
          </>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.nextButton} onClick={load}>
          Un'altra
        </button>
        <button className={styles.closeButton} onClick={onClose}>
          Chiudi
        </button>
      </div>
    </div>
  );
}
