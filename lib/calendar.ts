import * as ical from "node-ical";
import { santiagoMonthString, shiftMonthString } from "./dates";

export type Appointment = {
  title: string;
  description: string;
  start: Date;
};

export type MonthlyCount = { month: string; count: number };
export type ServiceCount = { label: string; count: number };

// Bloqueos de tiempo personal (no son citas de clientas) - ej: "Alisado" es
// ella agendando su propio pelo, no un servicio de uñas. Se excluyen por
// completo de las estadísticas y del listado de citas.
const PERSONAL_BLOCK_KEYWORDS = ["alisado"];

function isPersonalBlock(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return PERSONAL_BLOCK_KEYWORDS.some((k) => text.includes(k));
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const url = process.env.BOOKLY_CALENDAR_ICS_URL;
  if (!url) return [];

  const data = await ical.async.fromURL(url);
  const appointments: Appointment[] = [];
  for (const entry of Object.values(data)) {
    if (entry && entry.type === "VEVENT") {
      const title = String(entry.summary ?? "");
      const description = String(entry.description ?? "");
      if (isPersonalBlock(title, description)) continue;
      appointments.push({ title, description, start: new Date(entry.start) });
    }
  }
  return appointments.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// Categorización de citas para el desglose del dashboard - independiente de
// los NailServiceType usados por el bot de WhatsApp para registrar ingresos.
// El título de Bookly trae el nombre del servicio (a veces con relleno como
// "Servicio de GelX (Retiro de GelX de MartiNails)" o solo "Gelx"/"Biab"), así
// que buscamos palabras clave en vez de exigir una coincidencia exacta.
const APPOINTMENT_CATEGORIES: { label: string; keywords: string[] }[] = [
  { label: "Esmaltado Permanente", keywords: ["esmaltado permanente", "esmaltado"] },
  { label: "Gel X", keywords: ["gel x", "gel-x", "gelx", "extension", "extensión"] },
  { label: "Manicura Rusa", keywords: ["biab", "manicura rusa", "kapping", "capping"] },
];

function findCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const category of APPOINTMENT_CATEGORIES) {
    if (category.keywords.some((k) => lower.includes(k))) return category.label;
  }
  return null;
}

// El texto antes del primer "(" es el servicio principal; lo que sigue suele
// ser el retiro del servicio anterior (ej: "Servicio de Manicura Rusa (BIAB)
// (Retiro de GelX de MartiNails, ...)" es una cita de BIAB, no de Gel X).
// Priorizamos esa parte antes de buscar en el texto completo.
function matchAppointmentCategory(title: string, description: string): string | null {
  const primary = `${title.split("(")[0]} ${description.split("(")[0]}`;
  return findCategory(primary) ?? findCategory(`${title} ${description}`);
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
    const key = matchAppointmentCategory(a.title, a.description) ?? "Otro";
    serviceCounts.set(key, (serviceCounts.get(key) ?? 0) + 1);
  }
  const serviceBreakdown = APPOINTMENT_CATEGORIES.map((c) => ({ label: c.label, count: serviceCounts.get(c.label) ?? 0 }))
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
