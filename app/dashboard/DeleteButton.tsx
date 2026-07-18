"use client";

import { useTransition } from "react";

export function DeleteButton({ id, action }: { id: string; action: (id: string) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("¿Estás seguro de borrar esta transacción?")) {
          startTransition(() => action(id));
        }
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
      {isPending ? "…" : "Borrar"}
    </button>
  );
}
