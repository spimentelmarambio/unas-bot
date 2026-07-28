"use client";

import { useEffect } from "react";
import { formatDate, formatTime } from "@/lib/format";

export type AppointmentRow = {
  title: string;
  description: string;
  start: Date;
  category: string;
};

type Props = {
  appointment: AppointmentRow | null;
  onClose: () => void;
};

// Shared by the appointment table and the calendar so both surface the
// Bookly title/description (client name, retiro info, ...) the same way.
export function AppointmentDetailModal({ appointment, onClose }: Props) {
  useEffect(() => {
    if (!appointment) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appointment, onClose]);

  if (!appointment) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 120,
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
          <div><strong>Fecha:</strong> {formatDate(appointment.start)}</div>
          <div><strong>Hora:</strong> {formatTime(appointment.start)}</div>
          <div><strong>Servicio:</strong> {appointment.category}</div>
          {appointment.title && <div><strong>Título:</strong> {appointment.title}</div>}
          {appointment.description && <div><strong>Detalle:</strong> {appointment.description}</div>}
        </div>
        <button type="button" className="btn" onClick={onClose} style={{ marginTop: "1.2rem", width: "100%" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
