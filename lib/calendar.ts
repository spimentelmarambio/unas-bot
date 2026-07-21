import * as ical from "node-ical";
import { santiagoMonthString, shiftMonthString } from "./dates";
import { SERVICE_TYPE_LABELS } from "./schemas/message";

export type Appointment = {
  title: string;
  start: Date;
};

export type MonthlyCount = { month: string; count: number };
export type ServiceCount = { label: string; count: number };

export async function fetchAppointments(): Promise<Appointment[]> {
  const url = process.env.BOOKLY_CALENDAR_ICS_URL;
  if (!url) return [];

  const data = await ical.async.fromURL(url);
  const appointments: Appointment[] = [];
  for (const entry of Object.values(data)) {
    if (entry && entry.type === "VEVENT") {
      appointments.push({ title: String(entry.summary ?? ""), start: new Date(entry.start) });
    }
  }
  return appointments.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function daysElapsedInMonth(month: string): number {
  const now = new Date();
  if (month !== santiagoMonthString(now)) {
    const [year, monthIndex] = month.split("-").map(Number);
    return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    day: "2-digit",
  }).format(now);
  return Number(today);
}

export type AppointmentStats = {
  countThisMonth: number;
  averagePerMonth: number;
  monthsWithData: number;
  totalAppointments: number;
  busiestMonth: MonthlyCount | null;
  changeVsPreviousMonth: number | null;
  averagePerWeek: number;
  monthlySeries: MonthlyCount[];
  serviceBreakdown: ServiceCount[];
};

export async function getAppointmentStats(month: string): Promise<AppointmentStats | null> {
  if (!process.env.BOOKLY_CALENDAR_ICS_URL) return null;

  let appointments: Appointment[];
  try {
    appointments = await fetchAppointments();
  } catch (error) {
    console.error("Error leyendo el calendario de Bookly:", error);
    return null;
  }
  if (appointments.length === 0) return null;

  const countByMonth = new Map<string, number>();
  for (const a of appointments) {
    const key = santiagoMonthString(a.start);
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }

  const monthsWithData = countByMonth.size;
  const totalAppointments = appointments.length;
  const countThisMonth = countByMonth.get(month) ?? 0;

  const firstMonth = santiagoMonthString(appointments[0].start);
  const lastMonth = santiagoMonthString(appointments[appointments.length - 1].start);
  const fullSeries: MonthlyCount[] = [];
  for (let m = firstMonth; ; m = shiftMonthString(m, 1)) {
    fullSeries.push({ month: m, count: countByMonth.get(m) ?? 0 });
    if (m === lastMonth) break;
  }
  const monthlySeries = fullSeries.slice(-24);

  const busiestMonth = fullSeries.reduce<MonthlyCount | null>(
    (best, entry) => (!best || entry.count > best.count ? entry : best),
    null
  );

  const previousMonthCount = countByMonth.get(shiftMonthString(month, -1));
  const changeVsPreviousMonth =
    previousMonthCount && previousMonthCount > 0
      ? Math.round(((countThisMonth - previousMonthCount) / previousMonthCount) * 100)
      : null;

  const averagePerWeek = Math.round((countThisMonth / (daysElapsedInMonth(month) / 7)) * 10) / 10;

  const serviceCounts = new Map<string, number>();
  for (const a of appointments) {
    if (santiagoMonthString(a.start) !== month) continue;
    const label = Object.values(SERVICE_TYPE_LABELS).find(
      (l) => l.toLowerCase() === a.title.trim().toLowerCase()
    );
    const key = label ?? "Otro";
    serviceCounts.set(key, (serviceCounts.get(key) ?? 0) + 1);
  }
  const serviceBreakdown = Object.values(SERVICE_TYPE_LABELS)
    .map((label) => ({ label, count: serviceCounts.get(label) ?? 0 }))
    .concat(serviceCounts.has("Otro") ? [{ label: "Otro", count: serviceCounts.get("Otro")! }] : []);

  return {
    countThisMonth,
    averagePerMonth: monthsWithData > 0 ? Math.round(totalAppointments / monthsWithData) : 0,
    monthsWithData,
    totalAppointments,
    busiestMonth,
    changeVsPreviousMonth,
    averagePerWeek,
    monthlySeries,
    serviceBreakdown,
  };
}
