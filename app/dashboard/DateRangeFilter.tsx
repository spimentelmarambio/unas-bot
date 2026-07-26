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

// Opens collapsed by default so the compact filter row doesn't grow two
// extra fields for everyone - it only starts expanded if a range from a
// previous submit is still active, so returning to the page doesn't hide it.
export function DateRangeFilter({ defaultFrom, defaultTo }: Props) {
  const [open, setOpen] = useState(Boolean(defaultFrom || defaultTo));
  const hasRange = Boolean(defaultFrom || defaultTo);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
      <button
        type="button"
        className="date-range-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Ocultar rango de fechas personalizado" : "Filtrar por rango de fechas personalizado"}
        aria-pressed={open}
        style={{
          width: "36px",
          height: "36px",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          background: hasRange ? "var(--accent)" : "transparent",
          color: hasRange ? "#fff" : "var(--accent-dark)",
          border: hasRange ? "none" : "1px solid var(--border)",
          borderRadius: "50%",
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true">📅</span>
      </button>
      {open && (
        <>
          <label style={labelStyle}>
            Desde
            <input
              type="date"
              name="from"
              defaultValue={defaultFrom ?? ""}
              className="input"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
          </label>
          <label style={labelStyle}>
            Hasta
            <input
              type="date"
              name="to"
              defaultValue={defaultTo ?? ""}
              className="input"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
          </label>
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
              }}
            >
              Quitar
            </button>
          )}
        </>
      )}
    </div>
  );
}
