import { getSummary, getTransactions, monthRange } from "@/lib/transactions";
import { getAppointmentStats } from "@/lib/calendar";
import { santiagoMonthString, shiftMonthString } from "@/lib/dates";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/schemas/message";
import type { NailTransactionType } from "@/lib/generated/prisma/enums";
import { deleteTransactionAction } from "./actions";
import { DeleteButton } from "./DeleteButton";

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

function monthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const label = new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("es-CL", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isServiceType(value: string | undefined): value is ServiceType {
  return SERVICE_TYPES.includes(value as ServiceType);
}

function isTransactionType(value: string | undefined): value is NailTransactionType {
  return value === "INCOME" || value === "EXPENSE";
}

type Props = {
  searchParams: Promise<{ month?: string; type?: string; service?: string; section?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = params.month ?? santiagoMonthString();
  const section = (params.section ?? "resumen") as "resumen" | "transacciones" | "citas";
  const range = monthRange(month);
  const type = isTransactionType(params.type) ? params.type : undefined;
  // A service filter only applies to income - if "Gastos" is also selected,
  // the service filter doesn't make sense, so it's ignored.
  const serviceType = type !== "EXPENSE" && isServiceType(params.service) ? params.service : undefined;
  const hasActiveFilters = Boolean(type || serviceType);

  const [summary, transactions, appointmentStats] = await Promise.all([
    getSummary({ ...range, type, serviceType }),
    getTransactions({ ...range, type, serviceType }, 200),
    getAppointmentStats(month),
  ]);

  const effectiveType = serviceType ? "INCOME" : type;
  const showIncomeCard = effectiveType !== "EXPENSE";
  const showExpenseCard = effectiveType !== "INCOME";
  const showNetCard = !effectiveType;

  function monthHref(targetMonth: string): string {
    const qp = new URLSearchParams({ month: targetMonth, section });
    if (params.type) qp.set("type", params.type);
    if (params.service) qp.set("service", params.service);
    return `/dashboard?${qp.toString()}`;
  }

  function sectionHref(newSection: string): string {
    const qp = new URLSearchParams({ month, section: newSection });
    if (params.type) qp.set("type", params.type);
    if (params.service) qp.set("service", params.service);
    return `/dashboard?${qp.toString()}`;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 200,
        padding: "1.5rem 1rem",
        backgroundColor: "var(--card)",
        borderRight: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1.5rem", color: "var(--accent-dark)" }}>💅 MartiNails</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[
            { id: "resumen", label: "Resumen" },
            { id: "transacciones", label: "Transacciones" },
            { id: "citas", label: "Citas" },
          ].map((item) => (
            <a
              key={item.id}
              href={sectionHref(item.id)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.4rem",
                backgroundColor: section === item.id ? "var(--pink-bg)" : "transparent",
                color: section === item.id ? "var(--accent-dark)" : "var(--text)",
                fontWeight: section === item.id ? 600 : 500,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "block",
                transition: "all 0.2s",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem 1.5rem", maxWidth: 900 }}>
      <h1 style={{ fontSize: "1.8rem", margin: "0 0 1.5rem", color: "var(--accent-dark)" }}>
        💅 MartiNails
      </h1>

      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
        }}
      >
        <a href={monthHref(shiftMonthString(month, -1))} className="btn" style={{ textDecoration: "none" }}>
          ←
        </a>
        <strong style={{ minWidth: 160, textAlign: "center" }}>{monthLabel(month)}</strong>
        <a href={monthHref(shiftMonthString(month, 1))} className="btn" style={{ textDecoration: "none" }}>
          →
        </a>
      </div>

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
        <input type="hidden" name="month" value={month} />
        <label style={labelStyle}>
          Tipo
          <select name="type" defaultValue={params.type ?? "ALL"} className="input">
            <option value="ALL">Todos</option>
            <option value="INCOME">Ingresos</option>
            <option value="EXPENSE">Gastos</option>
          </select>
        </label>
        <label style={labelStyle}>
          Servicio
          <select
            name="service"
            defaultValue={params.service ?? "ALL"}
            className="input"
            disabled={params.type === "EXPENSE"}
          >
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
          <a href={`/dashboard?month=${month}`} style={{ fontSize: "0.85rem" }}>
            Limpiar filtros
          </a>
        )}
      </form>

      {appointmentStats && (
        <>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem", color: "var(--text)" }}>
            Citas (Bookly)
          </h2>
          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <div className="card" style={cardStyle}>
              <div style={cardLabelStyle}>Citas este mes</div>
              <div style={cardValueStyle}>{appointmentStats.countThisMonth}</div>
            </div>
            <div className="card" style={cardStyle}>
              <div style={cardLabelStyle}>Promedio citas/mes</div>
              <div style={cardValueStyle}>{appointmentStats.averagePerMonth}</div>
              <div style={cardSubStyle}>histórico, {appointmentStats.monthsWithData} meses</div>
            </div>
            {effectiveType !== "EXPENSE" && (
              <div className="card" style={cardStyle}>
                <div style={cardLabelStyle}>Citas vs. ingresos registrados</div>
                <div style={cardValueStyle}>
                  {appointmentStats.countThisMonth} / {summary.incomeCount}
                </div>
                <div style={cardSubStyle}>
                  {appointmentStats.countThisMonth === summary.incomeCount
                    ? "Coinciden"
                    : appointmentStats.countThisMonth > summary.incomeCount
                      ? `Faltarían ${appointmentStats.countThisMonth - summary.incomeCount} por registrar`
                      : `${summary.incomeCount - appointmentStats.countThisMonth} más de las agendadas`}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        {showIncomeCard && (
          <div className="card" style={cardStyle}>
            <div style={cardLabelStyle}>Ingresos</div>
            <div style={{ ...cardValueStyle, color: "var(--income)" }}>{formatCLP(summary.incomeTotal)}</div>
            <div style={cardSubStyle}>{summary.incomeCount} servicios</div>
          </div>
        )}
        {showExpenseCard && (
          <div className="card" style={cardStyle}>
            <div style={cardLabelStyle}>Gastos</div>
            <div style={{ ...cardValueStyle, color: "var(--expense)" }}>{formatCLP(summary.expenseTotal)}</div>
            <div style={cardSubStyle}>{summary.expenseCount} movimientos</div>
          </div>
        )}
        {showNetCard && (
          <div className="card" style={cardStyle}>
            <div style={cardLabelStyle}>Neto</div>
            <div style={{ ...cardValueStyle, color: "var(--accent-dark)" }}>{formatCLP(summary.net)}</div>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem", color: "var(--text)" }}>Movimientos</h2>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="pretty">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th style={{ textAlign: "right" }}>Monto</th>
              <th></th>
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
                <td style={{ textAlign: "right" }}>
                  <DeleteButton id={t.id} action={deleteTransactionAction} />
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  No hay movimientos para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </main>
    </div>
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
