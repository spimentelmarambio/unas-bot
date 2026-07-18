import { prisma } from "./prisma";
import { dateOnlyInSantiago, startOfMonthInSantiago, nextMonthStartInSantiago } from "./dates";
import type { NailTransactionType, NailServiceType } from "./generated/prisma/enums";
import type { Prisma } from "./generated/prisma/client";

export type NewTransaction = {
  type: NailTransactionType;
  amount: number;
  description: string;
  serviceType?: NailServiceType | null;
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
      serviceType: input.serviceType ?? null,
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

export type TransactionFilter = {
  start?: Date;
  // exclusive upper bound
  end?: Date;
  // restricts to just income or just expenses; ignored if serviceType is set
  type?: NailTransactionType;
  // when set, only INCOME rows of this service type are matched (expenses excluded)
  serviceType?: NailServiceType;
};

function buildWhere(filter: TransactionFilter): Prisma.NailTransactionWhereInput {
  const where: Prisma.NailTransactionWhereInput = {};
  if (filter.start || filter.end) {
    where.date = {
      ...(filter.start ? { gte: filter.start } : {}),
      ...(filter.end ? { lt: filter.end } : {}),
    };
  }
  if (filter.serviceType) {
    where.type = "INCOME";
    where.serviceType = filter.serviceType;
  } else if (filter.type) {
    where.type = filter.type;
  }
  return where;
}

export async function getSummary(filter: TransactionFilter = {}) {
  const where = buildWhere(filter);
  const entries = await prisma.nailTransaction.findMany({ where });
  const incomeEntries = entries.filter((e) => e.type === "INCOME");
  const expenseEntries = entries.filter((e) => e.type === "EXPENSE");
  const incomeTotal = incomeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const expenseTotal = expenseEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  return {
    incomeTotal,
    expenseTotal,
    net: incomeTotal - expenseTotal,
    incomeCount: incomeEntries.length,
    expenseCount: expenseEntries.length,
  };
}

export async function getTransactions(filter: TransactionFilter = {}, limit = 100) {
  const where = buildWhere(filter);
  return prisma.nailTransaction.findMany({ where, orderBy: { date: "desc" }, take: limit });
}

export async function deleteTransaction(id: string) {
  await prisma.nailTransaction.delete({ where: { id } });
}
