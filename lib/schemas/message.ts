import { z } from "zod";

// The business only offers these 3 services - keep in sync with the
// NailServiceType enum in prisma/schema.prisma.
export const SERVICE_TYPES = ["ESMALTADO_PERMANENTE", "GEL_X", "KAPPING"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ESMALTADO_PERMANENTE: "Esmaltado Permanente",
  GEL_X: "Gel X",
  KAPPING: "Kapping",
};

const LogIncomeSchema = z.object({
  intent: z.literal("log_income"),
  amount: z.number(),
  serviceType: z.enum(SERVICE_TYPES),
  clientName: z.string().optional(),
  // ISO date (YYYY-MM-DD), only set if the message names a specific past
  // day (e.g. "ayer", "el lunes") - omitted means "today".
  date: z.string().optional(),
  note: z.string().optional(),
});

const LogExpenseSchema = z.object({
  intent: z.literal("log_expense"),
  amount: z.number(),
  description: z.string(),
  date: z.string().optional(),
  note: z.string().optional(),
});

const QuerySummarySchema = z.object({
  intent: z.literal("query_summary"),
  // "YYYY-MM", only set if the message names a specific past month -
  // omitted means the current month.
  month: z.string().optional(),
});

const OtherSchema = z.object({
  intent: z.literal("other"),
});

export const ActionSchema = z.discriminatedUnion("intent", [
  LogIncomeSchema,
  LogExpenseSchema,
  QuerySummarySchema,
  OtherSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

// A single WhatsApp message can mention more than one thing at once (e.g.
// "hice un kapping de 28000 y compré insumos por 20000") - Claude extracts
// one action per thing mentioned, so all of them get registered instead of
// just the first.
export const InterpretedMessageSchema = z.object({
  actions: z.array(ActionSchema).min(1),
});

export type InterpretedMessage = z.infer<typeof InterpretedMessageSchema>;
