import { getSummary, getTransactions, monthRange } from "@/lib/transactions";
import { parseDateOnly } from "@/lib/dates";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/schemas/message";

export const dynamic = "force-dynamic";

function formatCLP(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

function isServiceType(value: string | undefined): value is ServiceType {
  return SERVICE_TYPES.includes(value as ServiceType);
}

type Props = {
  searchParams: Promise<{ from?: string; to?: string; service?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const hasCustomRange = Boolean(params.from || params.to);
  const range = hasCustomRange
    ? {
        start: params.from ? parseDateOnly(params.from) : undefined,
        end: params.to
          ? new Date(parseDateOnly(params.to).getTime() + 24 * 60 * 60 * 1000)
          : undefined,
      }
    : monthRange();
  const serviceType = isServiceType(params.service) ? params.service : undefined;
  const hasActiveFilters = hasCustomRange || Boolean(serviceType);

  const [summary, transactions] = await Promise.all([
    getSummary({ ...range, serviceType }),
    getTransactions({ ...range, serviceType }, 200),
  ]);

  const periodLabel = hasCustomRange ? "" : " este mes";

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.8rem", margin: "0 0 1.5rem", color: "var(--accent-dark)" }}>
        💅 MartiNails
      </h1>

      <form
        method="get"
        className="card"
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "end",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
        }}
      >
        <label style={labelStyle}>
          Desde
          <input type="date" name="from" defaultValue={params.from ?? ""} className="input" />
        </label>
        <label style={labelStyle}>
          Hasta
          <input type="date" name="to" defaultValue={params.to ?? ""} className="input" />
        </label>
        <label style={labelStyle}>
          Servicio
          <select name="service" defaultValue={params.service ?? "ALL"} className="input">
            <option value="ALL">Todos</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">
          Filtrar
        </button>
        {hasActiveFilters && (
          <a href="/dashboard" style={{ fontSize: "0.85rem" }}>
            Limpiar filtros
          </a>
        )}
      </form>

      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div className="card" style={cardStyle}>
          <div style={cardLabelStyle}>Ingresos{periodLabel}</div>
          <div style={{ ...cardValueStyle, color: "var(--income)" }}>{formatCLP(summary.incomeTotal)}</div>
          <div style={cardSubStyle}>{summary.incomeCount} servicios</div>
        </div>
        {!serviceType && (
          <div className="card" style={cardStyle}>
            <div style={cardLabelStyle}>Gastos{periodLabel}</div>
            <div style={{ ...cardValueStyle, color: "var(--expense)" }}>{formatCLP(summary.expenseTotal)}</div>
            <div style={cardSubStyle}>{summary.expenseCount} movimientos</div>
          </div>
        )}
        <div className="card" style={cardStyle}>
          <div style={cardLabelStyle}>Neto{periodLabel}</div>
          <div style={{ ...cardValueStyle, color: "var(--accent-dark)" }}>{formatCLP(summary.net)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem", color: "var(--text)" }}>Movimientos</h2>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="pretty">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th style={{ textAlign: "right" }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>
                  {t.description}
                  {t.clientName ? ` (${t.clientName})` : ""}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: t.type === "INCOME" ? "var(--income)" : "var(--expense)",
                    fontWeight: 600,
                  }}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatCLP(Number(t.amount))}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)" }}>
                  No hay movimientos para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  flex: "1 1 160px",
  padding: "0.9rem 1.1rem",
};

const cardLabelStyle: React.CSSProperties = { fontSize: "0.8rem", color: "var(--muted)" };
const cardValueStyle: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 700 };
const cardSubStyle: React.CSSProperties = { fontSize: "0.75rem", color: "var(--muted)" };
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.8rem",
  color: "var(--muted)",
  gap: "0.3rem",
};
