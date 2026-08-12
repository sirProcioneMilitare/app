import "server-only";

import webpush from "web-push";
import type { Role } from "./auth";
import { getSupabaseAdmin } from "./supabase";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.error("Chiavi VAPID mancanti: push saltata.");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * Invia una web push a tutte le subscription registrate per un ruolo.
 * Non lancia mai eccezioni: gli errori vengono loggati e le subscription
 * non piu' valide (410/404) vengono rimosse dal DB.
 */
export async function sendPushToRole(
  role: Role,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const supabase = getSupabaseAdmin();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("role", role);

  if (error) {
    console.error("Errore lettura push_subscriptions:", error);
    return;
  }

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;

      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("Errore invio push:", err);
      }
    }
  }
}
