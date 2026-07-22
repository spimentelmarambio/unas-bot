"use client";

import { useState, useTransition } from "react";

export function DeleteButton({
  id,
  action,
  label = "esta transacción",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={`Borrar ${label}`}
      title={error ? "No se pudo borrar, intenta de nuevo" : undefined}
      onClick={() => {
        if (!confirm(`¿Estás seguro de borrar ${label}?`)) return;
        setError(false);
        startTransition(async () => {
          try {
            await action(id);
          } catch {
            setError(true);
          }
        });
      }}
      style={{
        border: "1px solid var(--expense)",
        background: "transparent",
        color: "var(--expense)",
        borderRadius: 999,
        padding: "0.15rem 0.6rem",
        fontSize: "0.75rem",
        cursor: isPending ? "default" : "pointer",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {isPending ? "…" : error ? "Error, reintentar" : "Borrar"}
    </button>
  );
}
