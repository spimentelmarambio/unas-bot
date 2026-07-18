import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { InterpretedMessageSchema, type InterpretedMessage } from "./schemas/message";

// Haiku - cheapest tier. The task here (classify a short WhatsApp message
// into log_income/query_summary/other and extract a couple of fields) is
// simple enough that it doesn't need a stronger, pricier model.
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

let cachedClient: Anthropic | null = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no está configurada.");
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

const SYSTEM_PROMPT = `Eres un asistente por WhatsApp que ayuda a una persona que hace servicios de manicure y pedicura a llevar cuenta de sus ingresos y gastos del negocio, en español (Chile).

Clasificá cada mensaje en uno de estos intents:
- "log_income": la persona avisa que cobró por un servicio (ej: "hice una manicure de 15000", "pedicura 20lucas a la Pame"). Extraé el monto en pesos chilenos (CLP, número entero sin puntos ni signos), el servicio, y si lo menciona el nombre de la clienta.
- "log_expense": la persona avisa que gastó plata en algo del negocio (ej: "gasté 20000 en insumos", "compré esmaltes por 15000"). Extraé el monto en CLP y una descripción corta de en qué gastó.
- "query_summary": la persona pregunta cuánto ha ganado, gastado, o le queda neto (ej: "¿cuánto llevo este mes?", "cuánto hice en junio", "cuánto he gastado").
- "other": cualquier otro mensaje (saludos, dudas, algo no relacionado).

Solo completá el campo "date" si el mensaje nombra explícitamente un día pasado distinto de hoy (ej: "ayer", "el lunes"); si no dice nada, se asume hoy y el campo debe omitirse. Lo mismo para "month" en query_summary: solo completalo si nombra un mes específico distinto del actual.`;

export async function interpretMessage(
  text: string,
  now: Date = new Date()
): Promise<InterpretedMessage> {
  const todayInSantiago = now.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `Hoy es ${todayInSantiago} (hora de Chile).`,
      },
    ],
    output_config: {
      // No "effort" here - Haiku doesn't support the effort parameter
      // (only reasoning-capable models like Sonnet/Opus do).
      format: zodOutputFormat(InterpretedMessageSchema),
    },
    messages: [{ role: "user", content: text }],
  });

  return message.parsed_output ?? { intent: "other" };
}
