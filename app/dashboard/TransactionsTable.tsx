"use client";

import { useState } from "react";
import { formatCLP, formatDate } from "@/lib/format";
import { SCOPE_LABELS, type Scope } from "@/lib/schemas/message";
import { TransactionDetailDialog, type TransactionRow } from "./TransactionDetailDialog";

type Props = {
  rows: TransactionRow[];
  emptyMessage: string;
  onDelete: (id: string) => Promise<void>;
  onSave: (id: string, data: { amount: number; scope: Scope }) => Promise<void>;
};

// Income is business by definition, so tagging those rows would be noise -
// the badge only says something on a gasto.
function ScopeBadge({ scope }: { scope: Scope }) {
  const isPersonal = scope === "PERSONAL";
  return (
    <span
      style={{
        border: `1px solid ${isPersonal ? "var(--muted)" : "var(--accent-dark)"}`,
        background: isPersonal ? "transparent" : "var(--pink-bg-2)",
        color: isPersonal ? "var(--muted)" : "var(--accent-dark)",
        borderRadius: 999,
        padding: "0.1rem 0.5rem",
        fontSize: "0.7rem",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {SCOPE_LABELS[scope]}
    </span>
  );
}

export function TransactionsTable({ rows, emptyMessage, onDelete, onSave }: Props) {
  const [selected, setSelected] = useState<TransactionRow | null>(null);

  return (
    <>
      <table className="pretty tx-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th style={{ textAlign: "right" }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              className="tx-row"
              tabIndex={0}
              role="button"
              aria-label={`Ver detalle de ${t.description}, ${formatDate(t.date)}, ${formatCLP(t.amount)}`}
              onClick={() => setSelected(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(t);
                }
              }}
            >
              <td style={{ whiteSpace: "nowrap" }}>{formatDate(t.date)}</td>
              {/* max-width:0 + width:100% is what makes the ellipsis work
                  inside a table cell: it lets the cell shrink below its
                  content so the inner span can clip. */}
              <td style={{ fontSize: "0.9rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                  <span className="tx-desc">
                    {t.description}
                    {t.clientName ? ` (${t.clientName})` : ""}
                  </span>
                  {t.type === "EXPENSE" && <ScopeBadge scope={t.scope} />}
                </span>
              </td>
              <td
                style={{
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  color: t.type === "INCOME" ? "var(--income)" : "var(--expense)",
                  fontWeight: 600,
                }}
              >
                {t.type === "INCOME" ? "+" : "-"}
                {formatCLP(t.amount)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="table-empty" style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <TransactionDetailDialog
        // Remounts per row, so the form always starts from that row's values.
        key={selected?.id ?? "none"}
        transaction={selected}
        onClose={() => setSelected(null)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </>
  );
}
