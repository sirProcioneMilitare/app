"use client";

import { useRef, useState } from "react";
import { ApiClientError, uploadDaily } from "@/lib/client/endpoints";
import { dateInRome } from "@/lib/time";
import styles from "./regia-view.module.css";

const DURATA_MASSIMA_MS = 40000;

export function DailyRecorder() {
  const [stato, setStato] = useState<"idle" | "recording" | "recorded" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setStato("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setStato("recording");
      timeoutRef.current = setTimeout(() => stopRecording(), DURATA_MASSIMA_MS);
    } catch {
      setError("Non riesco ad accedere al microfono.");
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    mediaRecorderRef.current?.stop();
  }

  function scarta() {
    setAudioUrl(null);
    setStato("idle");
  }

  async function invia() {
    if (!mediaRecorderRef.current) return;
    const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current.mimeType || "audio/webm" });
    const domani = dateInRome(new Date(Date.now() + 86400000));

    const formData = new FormData();
    formData.set("tipo", "audio");
    formData.set("pubblicato_per", domani);
    formData.set("file", new File([blob], "drop.webm", { type: blob.type }));

    setStato("uploading");
    setError(null);
    try {
      await uploadDaily(formData);
      setStato("done");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setError("Hai gia' registrato il drop di domani.");
      } else {
        setError(err instanceof Error ? err.message : "Errore imprevisto.");
      }
      setStato("recorded");
    }
  }

  return (
    <div className={styles.cardDark}>
      <div className={styles.labelDark}>drop di domani · 8:30</div>
      <div className={styles.recLabel}>
        {stato === "idle" && "Non hai ancora registrato niente."}
        {stato === "recording" && "Sto registrando..."}
        {stato === "recorded" && "Pronto. Riascolta o invia."}
        {stato === "uploading" && "Invio..."}
        {stato === "done" && "Registrato. Si sblocca alle 8:30 di domani."}
      </div>

      {audioUrl && stato !== "done" && <audio className={styles.recPreview} controls src={audioUrl} />}

      {stato === "idle" && (
        <button className={styles.recButton} onClick={startRecording}>
          Registra 40 secondi
        </button>
      )}
      {stato === "recording" && (
        <button className={styles.recButton} onClick={stopRecording}>
          Ferma
        </button>
      )}
      {stato === "recorded" && (
        <>
          <button className={styles.recButton} onClick={invia}>
            Invia
          </button>
          <button className={styles.recButton} onClick={scarta} style={{ marginLeft: 8, background: "transparent" }}>
            Registra di nuovo
          </button>
        </>
      )}

      {error && <div className={styles.recError}>{error}</div>}
    </div>
  );
}
