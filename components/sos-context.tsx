"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiClientError, concludeSos, getSosActive, sendSos } from "@/lib/client/endpoints";
import type { SosActive, SosRequest } from "@/lib/client/types";

interface SosContextValue {
  active: SosActive | null;
  loadingActive: boolean;
  overlayOpen: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  send: (livello: 1 | 2 | 3, nota?: string) => Promise<void>;
  conclude: () => Promise<void>;
  sending: boolean;
  sendError: string | null;
  debounceRimanentiSecondi: number;
  now: number;
}

const SosContext = createContext<SosContextValue | null>(null);

export function SosProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SosActive | null>(null);
  const [loadingActive, setLoadingActive] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [debounceUntil, setDebounceUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchActive = useCallback(async () => {
    try {
      const res = await getSosActive();
      setActive(res);
      if (!res.sos) setDebounceUntil(null);
    } catch {
      // rete giu': lasciamo lo stato precedente, l'utente puo' comunque
      // provare a mandare l'SOS (il POST fara' fallire in modo esplicito).
    } finally {
      setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (active?.sos?.stato === "aperta") {
      pollRef.current = setInterval(fetchActive, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [active?.sos?.stato, active?.sos?.id, fetchActive]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const send = useCallback(
    async (livello: 1 | 2 | 3, nota?: string) => {
      setSending(true);
      setSendError(null);
      try {
        const res = await sendSos(livello, nota);
        setActive({ sos: res.sos, countdown_secondi: null, eta_at: null });
        setDebounceUntil(null);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 409) {
          const details = err.details as
            | { sos_esistente?: SosRequest; minuti_rimanenti?: number }
            | undefined;
          if (details?.sos_esistente) {
            setActive({ sos: details.sos_esistente, countdown_secondi: null, eta_at: null });
          }
          if (typeof details?.minuti_rimanenti === "number") {
            setDebounceUntil(Date.now() + details.minuti_rimanenti * 60000);
          }
          setSendError(err.message);
        } else {
          setSendError(err instanceof Error ? err.message : "Errore imprevisto.");
        }
      } finally {
        setSending(false);
      }
    },
    []
  );

  // "Sto meglio": chiude l'SOS lato server. Il debounce del backend guarda solo
  // gli SOS in stato aperta/presa_in_carico, quindi una volta concluso se ne
  // puo' mandare subito un altro: azzeriamo anche il countdown locale.
  const conclude = useCallback(async () => {
    const corrente = active?.sos;
    if (!corrente) return;
    try {
      await concludeSos(corrente.id);
    } catch {
      // Anche se fallisce rileggiamo lo stato reale qui sotto, cosi' la UI
      // non resta disallineata rispetto al server.
    }
    setDebounceUntil(null);
    await fetchActive();
  }, [active?.sos, fetchActive]);

  const debounceRimanentiSecondi = debounceUntil
    ? Math.max(0, Math.round((debounceUntil - now) / 1000))
    : 0;

  return (
    <SosContext.Provider
      value={{
        active,
        loadingActive,
        overlayOpen,
        openOverlay: () => {
          setSendError(null);
          setOverlayOpen(true);
          fetchActive();
        },
        closeOverlay: () => setOverlayOpen(false),
        send,
        conclude,
        sending,
        sendError,
        debounceRimanentiSecondi,
        now,
      }}
    >
      {children}
    </SosContext.Provider>
  );
}

export function useSos() {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error("useSos deve stare dentro <SosProvider>");
  return ctx;
}

export function formatMmSs(totalSecondi: number): string {
  const s = Math.max(0, totalSecondi);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
