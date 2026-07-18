import { prisma } from "./prisma";
import { dateOnlyInSantiago, startOfMonthInSantiago, nextMonthStartInSantiago } from "./dates";
import type { NailTransactionType } from "./generated/prisma/enums";

export type NewTransaction = {
  type: NailTransactionType;
  amount: number;
  description: string;
  clientName?: string | null;
  note?: string | null;
  date?: Date;
  whatsappFrom: string;
};

export async function createTransaction(input: NewTransaction) {
  return prisma.nailTransaction.create({
    data: {
      type: input.type,
      amount: input.amount,
      description: input.description,
      clientName: input.clientName ?? null,
      note: input.note ?? null,
      date: input.date ?? dateOnlyInSantiago(),
      whatsappFrom: input.whatsappFrom,
    },
  });
}

// month: "YYYY-MM"; defaults to the current Santiago calendar month.
export function monthRange(month?: string): { start: Date; end: Date } {
  if (!month) {
    return { start: startOfMonthInSantiago(), end: nextMonthStartInSantiago() };
  }
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));
  return { start, end };
}

export async function getMonthlySummary(month?: string) {
  const { start, end } = monthRange(month);
  const entries = await prisma.nailTransaction.findMany({
    where: { date: { gte: start, lt: end } },
  });
  const incomeTotal = entries
    .filter((e) => e.type === "INCOME")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const expenseTotal = entries
    .filter((e) => e.type === "EXPENSE")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  return {
    incomeTotal,
    expenseTotal,
    net: incomeTotal - expenseTotal,
    incomeCount: entries.filter((e) => e.type === "INCOME").length,
    expenseCount: entries.filter((e) => e.type === "EXPENSE").length,
    start,
    end,
  };
}

export async function getRecentTransactions(limit = 50) {
  return prisma.nailTransaction.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
}
