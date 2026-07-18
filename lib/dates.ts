const SANTIAGO_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Entries are stored as date-only values (UTC midnight of the calendar day).
// Any code starting from a real timestamp (WhatsApp message receipt time)
// has to go through this instead of `new Date()`, or a message sent after
// ~8-9pm in Chile lands past UTC midnight and gets filed under the next day.
export function dateOnlyInSantiago(when: Date = new Date()): Date {
  const isoDate = SANTIAGO_DATE_FORMATTER.format(when);
  return new Date(`${isoDate}T00:00:00.000Z`);
}

// "This month" totals have to mean the Santiago calendar month, not the UTC
// one - during evening hours in Chile, a plain UTC month boundary disagrees
// with dateOnlyInSantiago() about which month "today" is in.
export function startOfMonthInSantiago(when: Date = new Date()): Date {
  const [year, month] = SANTIAGO_DATE_FORMATTER.format(when).split("-");
  return new Date(`${year}-${month}-01T00:00:00.000Z`);
}

export function nextMonthStartInSantiago(when: Date = new Date()): Date {
  const start = startOfMonthInSantiago(when);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

// Parses a "YYYY-MM-DD" calendar day (as extracted from a WhatsApp message)
// into the same UTC-midnight representation dateOnlyInSantiago() produces.
export function parseDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
