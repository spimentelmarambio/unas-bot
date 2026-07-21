import Anthropic from "@anthropic-ai/sdk";

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

const SYSTEM_PROMPT = `Sos un asistente que responde preguntas sobre el negocio de manicure/pedicura MartiNails, en español (Chile), a partir de un resumen en JSON con los ingresos, gastos y citas agendadas.

Respondé en 1-2 oraciones, concreto, sin rodeos. Usá los números del JSON tal cual - no inventes datos que no estén ahí. Si la pregunta no se puede responder con la información dada, decilo directamente.`;

export async function answerDashboardQuestion(question: string, context: unknown): Promise<string> {
  try {
    console.log("[Chat] Iniciando pregunta:", question);
    const contextStr = JSON.stringify(context);
    console.log("[Chat] Contexto serializado, longitud:", contextStr.length);

    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 300,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Datos: ${contextStr}` },
      ],
      messages: [{ role: "user", content: question }],
    });

    console.log("[Chat] Respuesta recibida, bloques:", message.content.length);
    const textBlock = message.content.find((block) => block.type === "text");
    const result = textBlock?.text ?? "No pude generar una respuesta.";
    console.log("[Chat] Resultado final:", result.substring(0, 50));
    return result;
  } catch (error) {
    console.error("[Chat] Error:", error);
    throw error;
  }
}
