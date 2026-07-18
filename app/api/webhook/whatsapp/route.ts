import { NextResponse } from "next/server";
import { verifyWebhookSignature, parseIncomingMessage, sendWhatsAppMessage } from "@/lib/whatsapp";
import { interpretMessage } from "@/lib/claude";
import { createTransaction, getMonthlySummary } from "@/lib/transactions";
import { dateOnlyInSantiago, parseDateOnly } from "@/lib/dates";

function formatCLP(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function isAllowedSender(from: string): boolean {
  const allowlist = (process.env.WHATSAPP_ALLOWED_FROM ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return allowlist.includes(from);
}

// Meta's webhook handshake: it calls this once when you save the webhook
// config, and expects the verify token echoed back as hub.challenge.
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const incoming = parseIncomingMessage(payload);

  // Not an inbound text message (e.g. a delivery/read status ping) - just ack.
  if (!incoming) {
    return NextResponse.json({ ok: true });
  }

  // Ignore anyone who isn't the one person this bot is for.
  if (!isAllowedSender(incoming.from)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const interpreted = await interpretMessage(incoming.text);
    let reply: string;

    if (interpreted.intent === "log_income") {
      await createTransaction({
        type: "INCOME",
        amount: interpreted.amount,
        description: interpreted.service,
        clientName: interpreted.clientName,
        date: interpreted.date ? parseDateOnly(interpreted.date) : dateOnlyInSantiago(),
        whatsappFrom: incoming.from,
      });
      const summary = await getMonthlySummary();
      reply = `Anotado: ${interpreted.service} por ${formatCLP(interpreted.amount)}${
        interpreted.clientName ? ` (${interpreted.clientName})` : ""
      }. Llevas ${formatCLP(summary.incomeTotal)} en ${summary.incomeCount} servicios este mes.`;
    } else if (interpreted.intent === "log_expense") {
      await createTransaction({
        type: "EXPENSE",
        amount: interpreted.amount,
        description: interpreted.description,
        date: interpreted.date ? parseDateOnly(interpreted.date) : dateOnlyInSantiago(),
        whatsappFrom: incoming.from,
      });
      const summary = await getMonthlySummary();
      reply = `Anotado: gasto de ${formatCLP(interpreted.amount)} en ${
        interpreted.description
      }. Llevas ${formatCLP(summary.expenseTotal)} en gastos este mes.`;
    } else if (interpreted.intent === "query_summary") {
      const summary = await getMonthlySummary(interpreted.month);
      const period = interpreted.month ? "" : " este mes";
      reply = `Ingresos${period}: ${formatCLP(summary.incomeTotal)} (${
        summary.incomeCount
      } servicios). Gastos: ${formatCLP(summary.expenseTotal)}. Neto: ${formatCLP(summary.net)}.`;
    } else {
      reply =
        "Puedo anotar tus ingresos (ej: 'hice una manicure de 15000'), tus gastos (ej: 'gasté 20000 en insumos'), o decirte cuánto llevas en el mes (ej: '¿cuánto llevo este mes?').";
    }

    await sendWhatsAppMessage(incoming.from, reply);
  } catch (error) {
    console.error("Error procesando mensaje de WhatsApp:", error);
  }

  return NextResponse.json({ ok: true });
}
