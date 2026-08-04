"use client";

import { useEffect, useState, useTransition } from "react";
import { formatCLP, formatDate } from "@/lib/format";
import { SCOPE_LABELS, type Scope } from "@/lib/schemas/message";
import { DeleteButton } from "./DeleteButton";

export type TransactionRow = {
  id: string;
  date: Date;
  description: string;
  clientName: string | null;
  type: "INCOME" | "EXPENSE";
  scope: Scope;
  amount: number;
};

type Props = {
  transaction: TransactionRow | null;
  onClose: () => void;
  onSave: (id: string, data: { amount: number; scope: Scope }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

// The table truncates descriptions to one line, so this is where the full
// text lives - and, since it's already the "look at this row" surface, also
// where the two things the bot gets wrong (monto and ámbito) get fixed.
export function TransactionDetailDialog({ transaction, onClose, onSave, onDelete }: Props) {
  // The caller keys this component by transaction id, so each row opens a
  // fresh instance and these initialisers are the reset - no effect needed
  // to clear the previous row's edits.
  const [amount, setAmount] = useState(() => (transaction ? String(transaction.amount) : ""));
  const [scope, setScope] = useState<Scope>(transaction?.scope ?? "BUSINESS");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!transaction) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [transaction, onClose]);

  if (!transaction) return null;

  const isIncome = transaction.type === "INCOME";
  const parsedAmount = Number(amount);
  const amountIsValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isDirty = parsedAmount !== transaction.amount || scope !== transaction.scope;

  function save() {
    if (!transaction || !amountIsValid) return;
    setError(null);
    startTransition(async () => {
      try {
        await onSave(transaction.id, { amount: parsedAmount, scope });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar, intentá de nuevo");
      }
    });
  }

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
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la transacción"
        className="card"
        style={{ padding: "1.5rem", maxWidth: "420px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "var(--text)" }}>
          {isIncome ? "Ingreso" : "Gasto"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
          <div><strong>Fecha:</strong> {formatDate(transaction.date)}</div>
          {transaction.clientName && <div><strong>Clienta:</strong> {transaction.clientName}</div>}
          <div>
            <strong>Descripción:</strong>
            {/* Wraps and keeps the original line breaks - this is the whole
                point of the dialog, so it never gets clipped here. */}
            <p style={{ margin: "0.3rem 0 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--text)" }}>
              {transaction.description}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", marginTop: "1.2rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", color: "var(--muted)" }}>
            Monto
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              className="input"
              value={amount}
              disabled={isPending}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span style={{ fontSize: "0.75rem" }}>
              {amountIsValid ? formatCLP(Math.round(parsedAmount)) : "Tiene que ser un número mayor a cero"}
            </span>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", color: "var(--muted)" }}>
            Ámbito
            <select
              className="input"
              value={isIncome ? "BUSINESS" : scope}
              disabled={isIncome || isPending}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <option value="BUSINESS">{SCOPE_LABELS.BUSINESS}</option>
              <option value="PERSONAL">{SCOPE_LABELS.PERSONAL}</option>
            </select>
            {isIncome && (
              <span style={{ fontSize: "0.75rem" }}>Los ingresos son siempre del negocio.</span>
            )}
          </label>
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--expense)", fontSize: "0.8rem", marginTop: "0.9rem" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.2rem" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isPending} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn"
            onClick={save}
            disabled={isPending || !isDirty || !amountIsValid}
            style={{ flex: 1 }}
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>

        {/* Deleting lives here rather than in the row: a destructive control
            crammed next to the amount on a phone is one mis-tap away from
            losing a record, and it was eating the width the description
            needed. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
          <DeleteButton
            id={transaction.id}
            action={async (id) => {
              await onDelete(id);
              onClose();
            }}
            label={`${transaction.description} del ${formatDate(transaction.date)}, ${formatCLP(transaction.amount)}`}
          />
        </div>
      </div>
    </div>
  );
}
