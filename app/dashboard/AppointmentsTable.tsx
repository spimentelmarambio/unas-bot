"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/format";

export type AppointmentRow = {
  title: string;
  description: string;
  start: Date;
  category: string;
};

type Props = {
  rows: AppointmentRow[];
  emptyMessage: string;
};

// Bookly's title/description carry details (client name, retiro info, etc.)
// that don't fit in the table columns - clicking a row surfaces them in a
// modal instead of cramming everything into the row.
export function AppointmentsTable({ rows, emptyMessage }: Props) {
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

  useEffect(() => {
    if (!selected) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

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
                <td>{formatDate(apt.start)}</td>
                <td>{formatTime(apt.start)}</td>
                <td style={{ fontSize: "0.85rem" }} title={apt.title || undefined}>
                  {apt.category}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ padding: "1.5rem", maxWidth: "420px", width: "100%" }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "var(--text)" }}>Detalle de la cita</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
              <div><strong>Fecha:</strong> {formatDate(selected.start)}</div>
              <div><strong>Hora:</strong> {formatTime(selected.start)}</div>
              <div><strong>Servicio:</strong> {selected.category}</div>
              {selected.title && <div><strong>Título:</strong> {selected.title}</div>}
              {selected.description && <div><strong>Detalle:</strong> {selected.description}</div>}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setSelected(null)}
              style={{ marginTop: "1.2rem", width: "100%" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
