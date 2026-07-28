"use client";

import { useState } from "react";
import { formatAppointmentDate, formatAppointmentTime } from "@/lib/format";
import { AppointmentDetailModal, type AppointmentRow } from "./AppointmentDetailModal";

export type { AppointmentRow };

type Props = {
  rows: AppointmentRow[];
  emptyMessage: string;
};

// Bookly's title/description carry details (client name, retiro info, etc.)
// that don't fit in the table columns - clicking a row surfaces them in a
// modal instead of cramming everything into the row.
export function AppointmentsTable({ rows, emptyMessage }: Props) {
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

  return (
    <>
      <table className="pretty">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Servicio</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="table-empty" style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((apt, idx) => (
              <tr
                key={`${apt.start.getTime()}-${idx}`}
                onClick={() => setSelected(apt)}
                style={{ cursor: "pointer" }}
              >
                <td>{formatAppointmentDate(apt.start)}</td>
                <td>{formatAppointmentTime(apt.start)}</td>
                <td style={{ fontSize: "0.85rem" }} title={apt.title || undefined}>
                  {apt.category}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} />
    </>
  );
}
