import * as ical from "node-ical";
import { santiagoMonthString } from "./dates";

export type Appointment = {
  title: string;
  start: Date;
};

// Reads Bookly's appointments via Google Calendar's private "secret address
// in iCal format" feed - a plain read-only URL, no OAuth needed (Bookly
// itself already owns the OAuth connection that pushes appointments into
// this calendar; we only need to read it).
async function fetchAppointments(): Promise<Appointment[]> {
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

export type AppointmentStats = {
  countThisMonth: number;
  averagePerMonth: number;
  monthsWithData: number;
};

// Returns null when the calendar isn't configured, or the feed can't be
// read - the dashboard just hides this section in that case rather than
// breaking the whole page over an optional feature.
export async function getAppointmentStats(month: string): Promise<AppointmentStats | null> {
  if (!process.env.BOOKLY_CALENDAR_ICS_URL) return null;

  let appointments: Appointment[];
  try {
    appointments = await fetchAppointments();
  } catch (error) {
    console.error("Error leyendo el calendario de Bookly:", error);
    return null;
  }

  const countByMonth = new Map<string, number>();
  for (const a of appointments) {
    const key = santiagoMonthString(a.start);
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }

  const monthsWithData = countByMonth.size;
  const totalAppointments = appointments.length;

  return {
    countThisMonth: countByMonth.get(month) ?? 0,
    averagePerMonth: monthsWithData > 0 ? Math.round(totalAppointments / monthsWithData) : 0,
    monthsWithData,
  };
}
