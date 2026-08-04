import { prisma } from "./prisma";
import { dateOnlyInSantiago, startOfMonthInSantiago, nextMonthStartInSantiago } from "./dates";
import type { NailTransactionType, NailServiceType, NailScope } from "./generated/prisma/enums";
import type { Prisma } from "./generated/prisma/client";

export type NewTransaction = {
  type: NailTransactionType;
  amount: number;
  description: string;
  // Defaults to BUSINESS - income is always the business, and so is an
  // expense the classifier wasn't sure about.
  scope?: NailScope;
  serviceType?: NailServiceType | null;
  clientName?: string | null;
  note?: string | null;
  date?: Date;
  whatsappFrom: string;
  whatsappMessageId?: string | null;
};

export async function createTransaction(input: NewTransaction) {
  return prisma.nailTransaction.create({
    data: {
      type: input.type,
      amount: input.amount,
      description: input.description,
      scope: input.scope ?? "BUSINESS",
      serviceType: input.serviceType ?? null,
      clientName: input.clientName ?? null,
      note: input.note ?? null,
      date: input.date ?? dateOnlyInSantiago(),
      whatsappFrom: input.whatsappFrom,
      whatsappMessageId: input.whatsappMessageId ?? null,
    },
  });
}

// Meta redelivers webhooks it didn't get a fast 200 for, and our own reply
// can fail after a transaction was already saved - both would otherwise
// double-log the same income/expense. Checked once per incoming message
// before any action runs.
export async function wasMessageAlreadyProcessed(whatsappMessageId: string): Promise<boolean> {
  const existing = await prisma.nailTransaction.findFirst({
    where: { whatsappMessageId },
    select: { id: true },
  });
  return existing !== null;
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
  // business vs personal; PERSONAL only ever matches expenses, since income
  // is always the business
  scope?: NailScope;
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
  if (filter.scope) {
    where.scope = filter.scope;
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
  const businessExpenses = expenseEntries.filter((e) => e.scope === "BUSINESS");
  const personalExpenses = expenseEntries.filter((e) => e.scope === "PERSONAL");
  const total = (rows: typeof entries) => rows.reduce((sum, e) => sum + Number(e.amount), 0);

  const incomeTotal = total(incomeEntries);
  const businessExpenseTotal = total(businessExpenses);

  return {
    incomeTotal,
    incomeCount: incomeEntries.length,
    // Every expense in the filter, business and personal together.
    expenseTotal: total(expenseEntries),
    expenseCount: expenseEntries.length,
    businessExpenseTotal,
    businessExpenseCount: businessExpenses.length,
    personalExpenseTotal: total(personalExpenses),
    personalExpenseCount: personalExpenses.length,
    // "Ganancia" del negocio: los gastos personales no se le descuentan,
    // salen del bolsillo de ella, no de la caja del negocio.
    net: incomeTotal - businessExpenseTotal,
  };
}

export async function getTransactions(filter: TransactionFilter = {}, limit = 100) {
  const where = buildWhere(filter);
  return prisma.nailTransaction.findMany({ where, orderBy: { date: "desc" }, take: limit });
}

// The classifier gets it wrong sometimes ("compré tips" could be either),
// and without this the only fix would be deleting the row and re-sending
// the message from WhatsApp.
export async function setTransactionScope(id: string, scope: NailScope) {
  await prisma.nailTransaction.update({ where: { id }, data: { scope } });
}

export async function deleteTransaction(id: string) {
  await prisma.nailTransaction.delete({ where: { id } });
}
