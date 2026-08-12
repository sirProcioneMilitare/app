import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramSendResult {
  ok: boolean;
  messageId: number | null;
}

function getBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN non impostata: notifica Telegram saltata.");
    return null;
  }
  return token;
}

async function callTelegramApi(
  method: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown }> {
  const token = getBotToken();
  if (!token) return { ok: false };

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.ok) {
      console.error(`Errore chiamata Telegram ${method}:`, body);
      return { ok: false };
    }

    return { ok: true, result: body.result };
  } catch (err) {
    console.error(`Eccezione chiamata Telegram ${method}:`, err);
    return { ok: false };
  }
}

/**
 * Invia un messaggio a una chat. Non lancia mai eccezioni: se Telegram non
 * risponde o e' giu', logga l'errore e restituisce ok:false, cosi' il
 * chiamante puo' proseguire (l'SOS deve comunque essere salvato).
 */
export async function sendMessage(
  chatId: string,
  text: string,
  buttons?: InlineKeyboardButton[]
): Promise<TelegramSendResult> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (buttons && buttons.length > 0) {
    payload.reply_markup = { inline_keyboard: [buttons] };
  }

  const { ok, result } = await callTelegramApi("sendMessage", payload);
  const messageId =
    ok && result && typeof result === "object" && "message_id" in result
      ? Number((result as { message_id: unknown }).message_id)
      : null;

  return { ok, messageId };
}

export async function editMessageText(
  chatId: string,
  messageId: number,
  text: string,
  buttons?: InlineKeyboardButton[]
): Promise<{ ok: boolean }> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons && buttons.length > 0 ? [buttons] : [] },
  };

  const { ok } = await callTelegramApi("editMessageText", payload);
  return { ok };
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<{ ok: boolean }> {
  const { ok } = await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
  return { ok };
}
