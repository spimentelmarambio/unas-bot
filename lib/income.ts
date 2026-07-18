import { prisma } from "./prisma";
import { dateOnlyInSantiago, startOfMonthInSantiago, nextMonthStartInSantiago } from "./dates";

export type NewIncomeEntry = {
  amount: number;
  service: string;
  clientName?: string | null;
  note?: string | null;
  date?: Date;
  whatsappFrom: string;
};

export async function createIncomeEntry(input: NewIncomeEntry) {
  return prisma.nailIncomeEntry.create({
    data: {
      amount: input.amount,
      service: input.service,
      clientName: input.clientName ?? null,
      note: input.note ?? null,
      date: input.date ?? dateOnlyInSantiago(),
      whatsappFrom: input.whatsappFrom,
    },
  });
}

// month: "YYYY-MM"; defaults to the current Santiago calendar month.
function monthRange(month?: string): { start: Date; end: Date } {
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
  const entries = await prisma.nailIncomeEntry.findMany({
    where: { date: { gte: start, lt: end } },
  });
  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  return { total, count: entries.length, start, end };
}
