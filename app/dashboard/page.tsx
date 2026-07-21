import { getSummary, getTransactions, monthRange } from "@/lib/transactions";
import { getAppointmentStats, fetchAppointments } from "@/lib/calendar";
import { santiagoMonthString, shiftMonthString } from "@/lib/dates";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/schemas/message";
import type { NailTransactionType } from "@/lib/generated/prisma/enums";
import { deleteTransactionAction } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { ChatPanel } from "./ChatPanel";

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
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
  const serviceType = type !== "EXPENSE" && isServiceType(params.service) ? params.service : undefined;
  const hasActiveFilters = Boolean(type || serviceType);

  const [summary, transactions, appointmentStats, allAppointments] = await Promise.all([
    getSummary({ ...range, type, serviceType }),
    getTransactions({ ...range, type, serviceType }, 200),
    getAppointmentStats(month),
    fetchAppointments(),
  ]);

  const effectiveType = serviceType ? "INCOME" : type;
  const showIncomeCard = effectiveType !== "EXPENSE";
  const showExpenseCard = effectiveType !== "INCOME";
  const showNetCard = !effectiveType;

  // Filter appointments by month
  const appointmentsThisMonth = allAppointments.filter(
    (a) => santiagoMonthString(a.start) === month
  );

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
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", "@media(min-width: 768px)": { flexDirection: "row" } }}>
      {/* Sidebar - responsive */}
      <aside style={{
        width: "100%",
        maxWidth: "100%",
        padding: "1rem",
        backgroundColor: "var(--card)",
        borderBottom: "1px solid var(--border)",
        borderRight: "none",
        "@media(min-width: 768px)": {
          width: 180,
          maxWidth: 180,
          padding: "1.5rem 1rem",
          borderBottom: "none",
          borderRight: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }
      }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem", color: "var(--accent-dark)" }}>💅 MartiNails</h2>
        <nav style={{ display: "flex", flexDirection: "row", gap: "0.5rem", overflowX: "auto", "@media(min-width: 768px)": { flexDirection: "column" } }}>
          {[
            { id: "resumen", label: "📊 Resumen" },
            { id: "transacciones", label: "💰 Transacciones" },
            { id: "citas", label: "📅 Citas" },
          ].map((item) => (
            <a
              key={item.id}
              href={sectionHref(item.id)}
              style={{
                padding: "0.7rem 1rem",
                borderRadius: "0.4rem",
                backgroundColor: section === item.id ? "var(--pink-bg)" : "transparent",
                color: section === item.id ? "var(--accent-dark)" : "var(--text)",
                fontWeight: section === item.id ? 600 : 500,
                fontSize: "0.85rem",
                textDecoration: "none",
                display: "block",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "1.5rem", maxWidth: "100%", width: "100%" }}>
      <h1 style={{ fontSize: "1.4rem", margin: "0 0 1.5rem", color: "var(--accent-dark)" }}>
        💅 MartiNails
      </h1>

      {/* Month & Filter Controls */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "0.75rem 1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <a href={monthHref(shiftMonthString(month, -1))} className="btn" style={{ textDecoration: "none", padding: "0.5rem 0.75rem" }}>
          ←
        </a>
        <strong style={{ minWidth: 140, textAlign: "center", fontSize: "0.95rem" }}>{monthLabel(month)}</strong>
        <a href={monthHref(shiftMonthString(month, 1))} className="btn" style={{ textDecoration: "none", padding: "0.5rem 0.75rem" }}>
          →
        </a>
      </div>

      {/* RESUMEN SECTION */}
      {section === "resumen" && (
        <>
          {appointmentStats && (
            <>
              <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem", color: "var(--text)" }}>📊 Indicadores de Citas</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Este mes</div>
                  <div style={cardValueStyle}>{appointmentStats.countThisMonth}</div>
                </div>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Promedio/mes</div>
                  <div style={cardValueStyle}>{appointmentStats.averagePerMonth}</div>
                  <div style={cardSubStyle}>{appointmentStats.monthsWithData} meses</div>
                </div>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Promedio/semana</div>
                  <div style={cardValueStyle}>{appointmentStats.averagePerWeek}</div>
                </div>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Total histórico</div>
                  <div style={cardValueStyle}>{appointmentStats.totalAppointments}</div>
                </div>
                {appointmentStats.busiestMonth && (
                  <div className="card" style={cardStyle}>
                    <div style={cardLabelStyle}>Mes más movido</div>
                    <div style={cardValueStyle}>{appointmentStats.busiestMonth.month}</div>
                    <div style={cardSubStyle}>{appointmentStats.busiestMonth.count} citas</div>
                  </div>
                )}
                {appointmentStats.changeVsPreviousMonth !== null && (
                  <div className="card" style={cardStyle}>
                    <div style={cardLabelStyle}>Vs. mes anterior</div>
                    <div style={{ ...cardValueStyle, color: appointmentStats.changeVsPreviousMonth > 0 ? "var(--income)" : appointmentStats.changeVsPreviousMonth < 0 ? "var(--expense)" : "var(--text)" }}>
                      {appointmentStats.changeVsPreviousMonth > 0 ? "+" : ""}{appointmentStats.changeVsPreviousMonth}%
                    </div>
                  </div>
                )}
              </div>

              {appointmentStats.monthlySeries.length > 0 && (
                <>
                  <h3 style={{ fontSize: "1rem", margin: "1.5rem 0 1rem", color: "var(--text)" }}>📈 Evolución mensual</h3>
                  <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem", overflowX: "auto" }}>
                    <MonthlyBarChart series={appointmentStats.monthlySeries} currentMonth={month} />
                  </div>
                </>
              )}

              {appointmentStats.serviceBreakdown.length > 0 && (
                <>
                  <h3 style={{ fontSize: "1rem", margin: "1.5rem 0 1rem", color: "var(--text)" }}>💅 Servicios este mes</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
                    {appointmentStats.serviceBreakdown.map((service) => (
                      <div key={service.label} className="card" style={cardStyle}>
                        <div style={cardLabelStyle}>{service.label}</div>
                        <div style={cardValueStyle}>{service.count}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h3 style={{ fontSize: "1rem", margin: "1.5rem 0 1rem", color: "var(--text)" }}>💵 Ingresos & Gastos</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Ingresos</div>
                  <div style={{ ...cardValueStyle, color: "var(--income)" }}>{formatCLP(summary.incomeTotal)}</div>
                  <div style={cardSubStyle}>{summary.incomeCount} registros</div>
                </div>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Gastos</div>
                  <div style={{ ...cardValueStyle, color: "var(--expense)" }}>{formatCLP(summary.expenseTotal)}</div>
                  <div style={cardSubStyle}>{summary.expenseCount} registros</div>
                </div>
                <div className="card" style={cardStyle}>
                  <div style={cardLabelStyle}>Neto</div>
                  <div style={{ ...cardValueStyle, color: "var(--accent-dark)" }}>{formatCLP(summary.net)}</div>
                </div>
              </div>
            </>
          )}
          <ChatPanel month={month} />
        </>
      )}

      {/* TRANSACCIONES SECTION */}
      {section === "transacciones" && (
        <>
          <form method="get" className="card" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1.5rem", padding: "1rem 1.25rem" }}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="section" value="transacciones" />
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
              <select name="service" defaultValue={params.service ?? "ALL"} className="input" disabled={params.type === "EXPENSE"}>
                <option value="ALL">Todos</option>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>{SERVICE_TYPE_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn" style={{ padding: "0.5rem 1rem" }}>Filtrar</button>
            {hasActiveFilters && <a href={`/dashboard?month=${month}&section=transacciones`} style={{ fontSize: "0.85rem" }}>Limpiar</a>}
          </form>

          <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "var(--text)" }}>Transacciones</h2>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="pretty">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td style={{ fontSize: "0.9rem" }}>{t.description}{t.clientName ? ` (${t.clientName})` : ""}</td>
                    <td style={{ textAlign: "right", color: t.type === "INCOME" ? "var(--income)" : "var(--expense)", fontWeight: 600 }}>
                      {t.type === "INCOME" ? "+" : "-"}{formatCLP(Number(t.amount))}
                    </td>
                    <td style={{ textAlign: "right" }}><DeleteButton id={t.id} action={deleteTransactionAction} /></td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>No hay transacciones</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CITAS SECTION */}
      {section === "citas" && (
        <>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "var(--text)" }}>Listado de Citas</h2>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="pretty">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Servicio</th>
                </tr>
              </thead>
              <tbody>
                {appointmentsThisMonth.sort((a, b) => b.start.getTime() - a.start.getTime()).map((apt) => (
                  <tr key={apt.start.toISOString()}>
                    <td>{formatDate(apt.start)}</td>
                    <td>{formatTime(apt.start)}</td>
                    <td style={{ fontSize: "0.9rem" }}>{apt.title || "Sin nombre"}</td>
                  </tr>
                ))}
                {appointmentsThisMonth.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>No hay citas este mes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
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
