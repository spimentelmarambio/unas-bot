"use client";

import { useState, useTransition } from "react";

type Scope = "BUSINESS" | "PERSONAL";

const LABELS: Record<Scope, string> = { BUSINESS: "Negocio", PERSONAL: "Personal" };

// Reads as a label, works as a switch: one tap flips a misclassified gasto
// between negocio and personal. Cheaper than deleting the row and
// re-sending the message from WhatsApp, which was the only fix before.
export function ScopePill({
  id,
  scope,
  action,
  label,
}: {
  id: string;
  scope: Scope;
  action: (id: string, scope: Scope) => Promise<void>;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const next: Scope = scope === "BUSINESS" ? "PERSONAL" : "BUSINESS";
  const isPersonal = scope === "PERSONAL";
  const color = isPersonal ? "var(--muted)" : "var(--accent-dark)";

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={`${label}: ${LABELS[scope]}. Cambiar a ${LABELS[next]}`}
      title={error ? "No se pudo cambiar, intenta de nuevo" : `Cambiar a ${LABELS[next]}`}
      onClick={() => {
        setError(false);
        startTransition(async () => {
          try {
            await action(id, next);
          } catch {
            setError(true);
          }
        });
      }}
      style={{
        border: `1px solid ${error ? "var(--expense)" : color}`,
        background: isPersonal ? "transparent" : "var(--pink-bg-2)",
        color: error ? "var(--expense)" : color,
        borderRadius: 999,
        padding: "0.1rem 0.5rem",
        fontSize: "0.7rem",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        cursor: isPending ? "default" : "pointer",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {isPending ? "…" : error ? "Error" : LABELS[scope]}
    </button>
  );
}
