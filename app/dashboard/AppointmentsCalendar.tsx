"use client";

import { useEffect, useState } from "react";
import { formatAppointmentTime } from "@/lib/format";
import { AppointmentDetailModal, type AppointmentRow } from "./AppointmentDetailModal";

const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

// Bucket by the Chilean calendar day - the same day the table rows and the
// month filter use - so a cita listed as "31 jul" always lands on the 31st.
const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayHeading(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CL", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type Props = {
  rows: AppointmentRow[];
  month: string;
};

export function AppointmentsCalendar({ rows, month }: Props) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

  // Escape closes the day sheet; while a detail is open that modal owns Escape
  // so the first press steps back to the day instead of dismissing both.
  useEffect(() => {
    if (!openDay || selected) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenDay(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openDay, selected]);

  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  // getUTCDay() is Sunday-first; shift so Monday is 0 to match the header row.
  const leadingBlanks = (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;

  const byDay = new Map<string, AppointmentRow[]>();
  for (const row of rows) {
    const key = DAY_KEY.format(row.start);
    const existing = byDay.get(key);
    if (existing) existing.push(row);
    else byDay.set(key, [row]);
  }

  const todayKey = DAY_KEY.format(new Date());
  const dayRows = openDay
    ? [...(byDay.get(openDay) ?? [])].sort((a, b) => a.start.getTime() - b.start.getTime())
    : [];

  return (
    <>
      <div className="card cal-card">
        <div className="cal-grid cal-head" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-wd">{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const key = `${year}-${String(monthIndex).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = byDay.get(key)?.length ?? 0;
            const isToday = key === todayKey;
            const classes = ["cal-day", count > 0 ? "cal-day--has" : "", isToday ? "cal-day--today" : ""]
              .filter(Boolean)
              .join(" ");

            if (count === 0) {
              return (
                <div key={key} className={classes}>
                  <span className="cal-day-n">{day}</span>
                </div>
              );
            }
            return (
              <button
                key={key}
                type="button"
                className={classes}
                onClick={() => setOpenDay(key)}
                aria-label={`${day}: ${count} ${count === 1 ? "cita" : "citas"}`}
              >
                <span className="cal-day-n">{day}</span>
                <span className="cal-day-c">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="cal-foot">
          {rows.length} {rows.length === 1 ? "cita" : "citas"}
        </div>
      </div>

      {openDay && (
        <div
          onClick={() => setOpenDay(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ padding: "1.25rem", maxWidth: "420px", width: "100%", maxHeight: "80vh", overflowY: "auto" }}
          >
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "1rem", color: "var(--text)" }}>{dayHeading(openDay)}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {dayRows.map((apt, idx) => (
                <button
                  key={`${apt.start.getTime()}-${idx}`}
                  type="button"
                  className="cal-appt"
                  onClick={() => setSelected(apt)}
                >
                  <span className="cal-appt-time">{formatAppointmentTime(apt.start)}</span>
                  <span className="cal-appt-service">{apt.category}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setOpenDay(null)}
              style={{ marginTop: "1.1rem", width: "100%" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} />
    </>
  );
}
