/**
 * Registra il webhook Telegram per l'app, cosi' non serve farlo a mano con
 * curl. Uso:
 *
 *   APP_URL=https://tuo-dominio.vercel.app npm run setup:telegram
 *
 * oppure passando l'URL come primo argomento:
 *
 *   npm run setup:telegram -- https://tuo-dominio.vercel.app
 *
 * Richiede in ambiente: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
 */

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const baseUrl = process.argv[2] ?? process.env.APP_URL;

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN mancante nell'ambiente.");
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET mancante nell'ambiente.");
  if (!baseUrl) {
    throw new Error(
      "Serve l'URL dell'app: APP_URL=https://... npm run setup:telegram, oppure npm run setup:telegram -- https://..."
    );
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["callback_query"],
    }),
  });

  const body = await res.json();

  if (!res.ok || !body.ok) {
    console.error("Registrazione webhook fallita:", body);
    process.exit(1);
  }

  console.log(`Webhook registrato su ${webhookUrl}`);
  console.log(body);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
