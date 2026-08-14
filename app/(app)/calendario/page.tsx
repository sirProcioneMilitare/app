"use client";

import { useCallback, useEffect, useState } from "react";
import { cancelEvent, getEvents, respondEvent } from "@/lib/client/endpoints";
import type { CalendarEvent } from "@/lib/client/types";
import { formatGiorno, formatIntervallo } from "@/lib/client/format";
import { dateInRome } from "@/lib/time";
import { useMe } from "@/components/app-shell";
import styles from "./calendario.module.css";

const GIORNI_MOSTRATI = 21;

export default function CalendarioPage() {
  const me = useMe();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const da = new Date();
    da.setHours(0, 0, 0, 0);
    const a = new Date(Date.now() + GIORNI_MOSTRATI * 86400000);

    return getEvents({ da: da.toISOString(), a: a.toISOString() })
      .then((res) => setEvents(res.events))
      .catch(() => setErrore("Non riesco a caricare il calendario."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function rispondi(id: string, stato: "confermato" | "rifiutato") {
    setBusyId(id);
    setErrore(null);
    try {
      await respondEvent(id, stato);
      await refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setBusyId(null);
    }
  }

  async function annulla(id: string) {
    setBusyId(id);
    setErrore(null);
    try {
      await cancelEvent(id);
      await refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setBusyId(null);
    }
  }

  const nomeDi = (role: string) => (role === me.role ? me.nome : me.altro.nome);

  // Inviti che aspettano una MIA risposta (li ha mandati l'altra persona).
  const invitiDaRispondere = events.filter(
    (e) => e.stato === "in_attesa" && e.creato_da !== me.role
  );
  // Inviti che ho mandato io e aspettano l'altra persona.
  const invitiMandati = events.filter(
    (e) => e.stato === "in_attesa" && e.creato_da === me.role
  );

  const confermati = events.filter((e) => e.stato === "confermato");

  const perGiorno = new Map<string, CalendarEvent[]>();
  for (const e of confermati) {
    const giorno = dateInRome(e.inizio_at);
    const lista = perGiorno.get(giorno) ?? [];
    lista.push(e);
    perGiorno.set(giorno, lista);
  }
  const giorniOrdinati = [...perGiorno.keys()].sort();

  return (
    <div className={styles.stack}>
      <div className={styles.title}>Calendario</div>

      {errore && <div className={styles.errore}>{errore}</div>}

      {invitiDaRispondere.length > 0 && (
        <div className={styles.inviti}>
          <div className={styles.sectionLabel}>inviti da accettare</div>
          {invitiDaRispondere.map((e) => (
            <div key={e.id} className={styles.invito}>
              <div className={styles.invitoHead}>
                <div className={styles.invitoEmoji}>{e.activity_types?.emoji}</div>
                <div>
                  <div className={styles.invitoNome}>{e.activity_types?.nome}</div>
                  <div className={styles.invitoQuando}>
                    {formatGiorno(dateInRome(e.inizio_at))} ·{" "}
                    {formatIntervallo(e.inizio_at, e.fine_at)}
                  </div>
                </div>
              </div>
              {e.nota && <div className={styles.invitoNota}>“{e.nota}”</div>}
              <div className={styles.invitoAzioni}>
                <button
                  className={styles.accetta}
                  disabled={busyId === e.id}
                  onClick={() => rispondi(e.id, "confermato")}
                >
                  Accetto
                </button>
                <button
                  className={styles.rifiuta}
                  disabled={busyId === e.id}
                  onClick={() => rispondi(e.id, "rifiutato")}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {invitiMandati.length > 0 && (
        <div className={styles.inviti}>
          <div className={styles.sectionLabel}>in attesa di risposta</div>
          {invitiMandati.map((e) => (
            <div key={e.id} className={styles.evento}>
              <div className={styles.eventoEmoji}>{e.activity_types?.emoji}</div>
              <div className={styles.eventoBody}>
                <div className={styles.eventoNome}>{e.activity_types?.nome}</div>
                <div className={styles.eventoOra}>
                  {formatGiorno(dateInRome(e.inizio_at))} ·{" "}
                  {formatIntervallo(e.inizio_at, e.fine_at)}
                </div>
                <div className={styles.eventoChi}>
                  aspetta che {me.altro.nome} risponda
                </div>
              </div>
              <button
                className={styles.annulla}
                disabled={busyId === e.id}
                onClick={() => annulla(e.id)}
              >
                ritira
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && giorniOrdinati.length === 0 && (
        <div className={styles.vuoto}>
          Niente in programma. Vai su <strong>Prenota</strong> per aggiungere
          qualcosa.
        </div>
      )}

      {giorniOrdinati.map((giorno) => (
        <div key={giorno} className={styles.giorno}>
          <div className={styles.giornoLabel}>{formatGiorno(giorno)}</div>
          {(perGiorno.get(giorno) ?? []).map((e) => {
            const insieme = e.activity_types?.insieme ?? false;
            return (
              <div
                key={e.id}
                className={`${styles.evento} ${insieme ? styles.insieme : styles.personale}`}
              >
                <div className={styles.eventoEmoji}>{e.activity_types?.emoji}</div>
                <div className={styles.eventoBody}>
                  <div className={styles.eventoNome}>{e.activity_types?.nome}</div>
                  <div className={styles.eventoOra}>
                    {formatIntervallo(e.inizio_at, e.fine_at)}
                  </div>
                  <div className={styles.eventoChi}>
                    {insieme ? "insieme" : nomeDi(e.creato_da)}
                  </div>
                  {e.nota && <div className={styles.eventoNota}>“{e.nota}”</div>}
                </div>
                <button
                  className={styles.annulla}
                  disabled={busyId === e.id}
                  onClick={() => annulla(e.id)}
                >
                  annulla
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
