"use client";

import { useState } from "react";

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.8rem",
  color: "var(--muted)",
  gap: "0.3rem",
};

type Props = {
  defaultFrom?: string;
  defaultTo?: string;
};

// The icon opens a popup asking for "desde"/"hasta" instead of pushing two
// extra fields into the compact filter row - closes on Aplicar, on Quitar,
// or on clicking the backdrop.
export function DateRangeFilter({ defaultFrom, defaultTo }: Props) {
  const [open, setOpen] = useState(false);
  const hasRange = Boolean(defaultFrom || defaultTo);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        className="date-range-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={hasRange ? "Cambiar rango de fechas personalizado" : "Filtrar por rango de fechas personalizado"}
        aria-pressed={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.3rem 0.6rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          whiteSpace: "nowrap",
          background: hasRange ? "var(--accent)" : "transparent",
          color: hasRange ? "#fff" : "var(--muted)",
          border: hasRange ? "none" : "1px solid var(--border)",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Fecha
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0, 0, 0, 0.25)" }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 100,
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              width: "230px",
              maxWidth: "calc(100vw - 2rem)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
            }}
          >
            <label style={labelStyle}>
              Desde
              <input type="date" name="from" defaultValue={defaultFrom ?? ""} className="input" />
            </label>
            <label style={labelStyle}>
              Hasta
              <input type="date" name="to" defaultValue={defaultTo ?? ""} className="input" />
            </label>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              <button type="submit" className="btn date-range-apply" style={{ flex: 1, fontSize: "0.85rem", padding: "0.5rem" }}>
                Aplicar
              </button>
              {hasRange && (
                <button
                  type="button"
                  className="date-range-clear"
                  onClick={(e) => {
                    const form = e.currentTarget.form;
                    if (!form) return;
                    const fromInput = form.elements.namedItem("from") as HTMLInputElement | null;
                    const toInput = form.elements.namedItem("to") as HTMLInputElement | null;
                    if (fromInput) fromInput.value = "";
                    if (toInput) toInput.value = "";
                    setOpen(false);
                    form.requestSubmit();
                  }}
                  aria-label="Quitar rango de fechas personalizado"
                  style={{
                    fontSize: "0.75rem",
                    background: "none",
                    border: "none",
                    color: "var(--accent-dark)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
