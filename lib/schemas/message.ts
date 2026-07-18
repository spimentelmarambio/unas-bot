import { z } from "zod";

const LogIncomeSchema = z.object({
  intent: z.literal("log_income"),
  amount: z.number(),
  service: z.string(),
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

export const InterpretedMessageSchema = z.discriminatedUnion("intent", [
  LogIncomeSchema,
  LogExpenseSchema,
  QuerySummarySchema,
  OtherSchema,
]);

export type InterpretedMessage = z.infer<typeof InterpretedMessageSchema>;
