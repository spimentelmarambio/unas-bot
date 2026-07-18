import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_API_VERSION = "v21.0";

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace("sha256=", "");

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type IncomingWhatsAppMessage = {
  from: string;
  text: string;
};

// Meta sends both real messages and status-update pings (delivered/read) to
// the same webhook - status pings have no `messages` array, so this returns
// null for anything that isn't an actual inbound text message.
export function parseIncomingMessage(payload: unknown): IncomingWhatsAppMessage | null {
  const entry = (payload as { entry?: unknown[] })?.entry?.[0] as
    | { changes?: unknown[] }
    | undefined;
  const change = entry?.changes?.[0] as { value?: unknown } | undefined;
  const value = change?.value as
    | { messages?: { from?: string; type?: string; text?: { body?: string } }[] }
    | undefined;
  const message = value?.messages?.[0];

  if (!message || message.type !== "text" || !message.from || !message.text?.body) {
    return null;
  }

  return { from: message.from, text: message.text.body };
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Error enviando WhatsApp (${response.status}): ${errorBody}`);
  }
}
