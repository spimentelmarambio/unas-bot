import { NextResponse } from "next/server";
import { verifyWebhookSignature, parseIncomingMessage, sendWhatsAppMessage } from "@/lib/whatsapp";
import { interpretMessage } from "@/lib/claude";
import { createTransaction, getSummary, monthRange } from "@/lib/transactions";
import { dateOnlyInSantiago, parseDateOnly } from "@/lib/dates";
import { SERVICE_TYPE_LABELS, type Action } from "@/lib/schemas/message";

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

// Runs one action and returns a short line describing what it did, or null
// for "query_summary"/"other" (handled separately since they don't log
// anything and shouldn't repeat the monthly totals per action).
async function runLoggingAction(action: Action, whatsappFrom: string): Promise<string | null> {
  if (action.intent === "log_income") {
    const serviceLabel = SERVICE_TYPE_LABELS[action.serviceType];
    await createTransaction({
      type: "INCOME",
      amount: action.amount,
      description: serviceLabel,
      serviceType: action.serviceType,
      clientName: action.clientName,
      date: action.date ? parseDateOnly(action.date) : dateOnlyInSantiago(),
      whatsappFrom,
    });
    return `${serviceLabel} +${formatCLP(action.amount)}${action.clientName ? ` (${action.clientName})` : ""}`;
  }
  if (action.intent === "log_expense") {
    await createTransaction({
      type: "EXPENSE",
      amount: action.amount,
      description: action.description,
      date: action.date ? parseDateOnly(action.date) : dateOnlyInSantiago(),
      whatsappFrom,
    });
    return `${action.description} -${formatCLP(action.amount)}`;
  }
  return null;
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

    // A single message can mention several things at once (an income AND
    // an expense) - log every action, then reply once with everything that
    // got anotado plus the month totals, instead of one reply per action.
    const loggedLines: string[] = [];
    let summaryReply: string | null = null;
    let sawOther = false;

    for (const action of interpreted.actions) {
      if (action.intent === "query_summary") {
        const summary = await getSummary(monthRange(action.month));
        const period = action.month ? "" : " este mes";
        summaryReply = `Ingresos${period}: ${formatCLP(summary.incomeTotal)} (${
          summary.incomeCount
        } servicios). Gastos: ${formatCLP(summary.expenseTotal)}. Neto: ${formatCLP(summary.net)}.`;
      } else if (action.intent === "other") {
        sawOther = true;
      } else {
        const line = await runLoggingAction(action, incoming.from);
        if (line) loggedLines.push(line);
      }
    }

    let reply: string;
    if (loggedLines.length > 0) {
      const summary = await getSummary(monthRange());
      reply = `Anotado: ${loggedLines.join(", ")}. Llevas ${formatCLP(
        summary.incomeTotal
      )} en ingresos y ${formatCLP(summary.expenseTotal)} en gastos este mes.`;
    } else if (summaryReply) {
      reply = summaryReply;
    } else if (sawOther) {
      reply =
        "Puedo anotar tus ingresos (ej: 'hice un esmaltado permanente de 15000'), tus gastos (ej: 'gasté 20000 en insumos'), o decirte cuánto llevas en el mes (ej: '¿cuánto llevo este mes?').";
    } else {
      reply = "No entendí el mensaje, ¿podés reformularlo?";
    }

    await sendWhatsAppMessage(incoming.from, reply);
  } catch (error) {
    console.error("Error procesando mensaje de WhatsApp:", error);
  }

  return NextResponse.json({ ok: true });
}
