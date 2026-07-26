import { getSummary, getTransactions, monthRange } from "@/lib/transactions";
import { getAppointmentStats, fetchAppointments, matchAppointmentCategory, buildServiceBreakdown, APPOINTMENT_CATEGORY_LABELS } from "@/lib/calendar";
import { santiagoMonthString, shiftMonthString } from "@/lib/dates";
import { formatCLP, formatDate, formatTime } from "@/lib/format";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/schemas/message";
import type { NailTransactionType } from "@/lib/generated/prisma/enums";
import { deleteTransactionAction } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { ChatPanel } from "./ChatPanel";
import { TypeServiceFilter } from "./TypeServiceFilter";
import { AppointmentServiceFilter } from "./AppointmentServiceFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { AppointmentsTable } from "./AppointmentsTable";

export const dynamic = "force-dynamic";

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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | undefined): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

type Props = {
  searchParams: Promise<{ month?: string; type?: string; service?: string; section?: string; from?: string; to?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentMonth = santiagoMonthString();
  const month = params.month ?? currentMonth;
  const section = (params.section ?? "resumen") as "resumen" | "transacciones" | "citas";
  const type = isTransactionType(params.type) ? params.type : undefined;
  const serviceType = type !== "EXPENSE" && isServiceType(params.service) ? params.service : undefined;

  // A custom "desde/hasta" range overrides the selected month for anything
  // that can filter by an arbitrary window (transactions, the appointment
  // list, this month's service breakdown). Monthly aggregates like the
  // historical chart and "promedio/mes" don't have a custom-range
  // equivalent, so those stay keyed off `month` regardless.
  const customFrom = isIsoDate(params.from) ? params.from : undefined;
  const customTo = isIsoDate(params.to) ? params.to : undefined;
  const hasCustomRange = Boolean(customFrom || customTo);
  const range = hasCustomRange
    ? {
        start: customFrom ? new Date(`${customFrom}T00:00:00.000Z`) : undefined,
        end: customTo ? new Date(new Date(`${customTo}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) : undefined,
      }
    : monthRange(month);
  const hasActiveFilters = Boolean(type || serviceType || hasCustomRange);

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

  // Appointments in the active window - the custom range when set, otherwise the selected month.
  const appointmentsInRange = allAppointments.filter((a) => {
    if (hasCustomRange) {
      if (range.start && a.start < range.start) return false;
      if (range.end && a.start >= range.end) return false;
      return true;
    }
    return santiagoMonthString(a.start) === month;
  });
  const resumenServiceBreakdown = hasCustomRange
    ? buildServiceBreakdown(appointmentsInRange)
    : appointmentStats?.serviceBreakdown ?? [];

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
    if (customFrom) qp.set("from", customFrom);
    if (customTo) qp.set("to", customTo);
    return `/dashboard?${qp.toString()}`;
  }

  // "Limpiar" drops the type/service filters and any custom date range -
  // it shouldn't also bounce the user back to the current month if they
  // were browsing a past one.
  function clearFiltersHref(targetSection: string): string {
    return `/dashboard?${new URLSearchParams({ month, section: targetSection }).toString()}`;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--pink-bg)", flexDirection: "row" }} className="dashboard-container">
      {/* Sidebar - lateral */}
      <aside style={{
        width: "180px",
        padding: "1.5rem 0.8rem",
        backgroundColor: "var(--card)",
        borderRight: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }} className="sidebar dashboard-sidebar">
        <div style={{ marginBottom: "1.5rem", paddingLeft: "0.5rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0", color: "var(--accent)", fontWeight: 700 }}>MartiNails</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1 }}>
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
                borderRadius: "6px",
                backgroundColor: section === item.id ? "var(--accent)" : "transparent",
                color: section === item.id ? "#fff" : "var(--text)",
                fontWeight: section === item.id ? 600 : 400,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "block",
                transition: "all 0.2s",
                borderLeft: section === item.id ? "3px solid var(--accent-dark)" : "3px solid transparent",
                paddingLeft: section === item.id ? "0.8rem" : "1rem",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.8rem", marginTop: "1rem" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <a
              href={sectionHref("resumen")}
              aria-label="Chat IA - disponible en la sección Resumen"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                backgroundColor: "transparent",
                color: "var(--text)",
                fontWeight: 400,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "block",
                transition: "all 0.2s",
                borderLeft: "3px solid transparent",
              }}
            >
              Chat IA
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: "100%", width: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%", flex: 1 }}>

      {/* RESUMEN SECTION */}
      {section === "resumen" && (
        <>
          <form method="get" className="card filter-form filter-form--compact" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end", justifyContent: "center", marginBottom: "2.5rem", padding: "1.2rem 1.2rem" }}>
            <input type="hidden" name="section" value="resumen" />
            <input type="hidden" name="month" value={month} />
            <div className="month-nav-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <a href={monthHref(shiftMonthString(month, -1))} aria-label="Mes anterior" className="btn month-nav-arrow" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>←</a>
              <span className="month-nav-label" style={{ minWidth: "110px", textAlign: "center", fontWeight: 600, fontSize: "0.95rem" }}>{monthLabel(month)}</span>
              <a href={monthHref(shiftMonthString(month, 1))} aria-label="Mes siguiente" className="btn month-nav-arrow" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>→</a>
              {month !== currentMonth && <a href={monthHref(currentMonth)} aria-label="Ir a este mes" className="btn month-nav-today" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Hoy</a>}
              <DateRangeFilter defaultFrom={customFrom} defaultTo={customTo} />
            </div>
            <TypeServiceFilter
              defaultType={params.type ?? "ALL"}
              defaultService={params.service ?? "ALL"}
              serviceOptions={SERVICE_TYPES.map((s) => ({ value: s, label: SERVICE_TYPE_LABELS[s] }))}
            />
            {hasActiveFilters && <a href={clearFiltersHref("resumen")} aria-label="Limpiar filtros" style={{ fontSize: "0.75rem" }}>Limpiar</a>}
          </form>

          {appointmentStats && (
            <>
              {resumenServiceBreakdown.length > 0 && (
                <>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 1rem", color: "var(--text)" }}><span aria-hidden="true">💅</span> Servicios este mes</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
                    {resumenServiceBreakdown.map((service) => (
                      <div key={service.label} className="card" style={cardStyle}>
                        <div style={cardLabelStyle}>{service.label}</div>
                        <div style={cardValueStyle}>{service.count}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h3 style={{ fontSize: "1rem", margin: "1.5rem 0 1rem", color: "var(--text)" }}><span aria-hidden="true">💵</span> Ingresos & Gastos</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
                {showIncomeCard && (
                  <div className="card" style={cardStyle}>
                    <div style={cardLabelStyle}>Ingresos</div>
                    <div style={{ ...cardValueStyle, color: "var(--income)" }}>{formatCLP(summary.incomeTotal)}</div>
                    <div style={cardSubStyle}>{summary.incomeCount} registros</div>
                  </div>
                )}
                {showExpenseCard && (
                  <div className="card" style={cardStyle}>
                    <div style={cardLabelStyle}>Gastos</div>
                    <div style={{ ...cardValueStyle, color: "var(--expense)" }}>{formatCLP(summary.expenseTotal)}</div>
                    <div style={cardSubStyle}>{summary.expenseCount} registros</div>
                  </div>
                )}
                {showNetCard && (
                  <div className="card" style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                    <div style={cardLabelStyle}>Ganancia</div>
                    <div style={{ ...cardValueStyle, color: "var(--accent-dark)" }}>{formatCLP(summary.net)}</div>
                  </div>
                )}
              </div>
              {summary.incomeCount === 0 && summary.expenseCount === 0 && !hasActiveFilters && (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", marginTop: "-1rem", marginBottom: "2rem" }}>
                  Aún no hay ingresos ni gastos registrados este mes. Escríbele a tu bot de WhatsApp para anotarlos (ej: &quot;hice un gel x de 20000&quot;).
                </p>
              )}

              {appointmentStats.monthlySeries.length > 0 && (
                <>
                  <h3 style={{ fontSize: "1rem", margin: "1.5rem 0 1rem", color: "var(--text)" }}><span aria-hidden="true">📈</span> Evolución mensual</h3>
                  <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                    <MonthlyBarChart series={appointmentStats.monthlySeries} currentMonth={month} />
                  </div>
                </>
              )}

              <h1 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "var(--text)", textAlign: "center" }}><span aria-hidden="true">📊</span> Indicadores de Citas</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.8rem", marginBottom: "2rem" }} className="kpi-grid">
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
            </>
          )}
          <ChatPanel month={month} />
        </>
      )}

      {/* TRANSACCIONES SECTION */}
      {section === "transacciones" && (
        <>
          <form method="get" className="card filter-form filter-form--compact" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end", justifyContent: "center", marginBottom: "1.5rem", padding: "1.2rem 1.2rem" }}>
            <input type="hidden" name="section" value="transacciones" />
            <input type="hidden" name="month" value={month} />
            <div className="month-nav-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <a href={monthHref(shiftMonthString(month, -1))} aria-label="Mes anterior" className="btn month-nav-arrow" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>←</a>
              <span className="month-nav-label" style={{ minWidth: "110px", textAlign: "center", fontWeight: 600, fontSize: "0.95rem" }}>{monthLabel(month)}</span>
              <a href={monthHref(shiftMonthString(month, 1))} aria-label="Mes siguiente" className="btn month-nav-arrow" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>→</a>
              {month !== currentMonth && <a href={monthHref(currentMonth)} aria-label="Ir a este mes" className="btn month-nav-today" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Hoy</a>}
              <DateRangeFilter defaultFrom={customFrom} defaultTo={customTo} />
            </div>
            <TypeServiceFilter
              defaultType={params.type ?? "ALL"}
              defaultService={params.service ?? "ALL"}
              serviceOptions={SERVICE_TYPES.map((s) => ({ value: s, label: SERVICE_TYPE_LABELS[s] }))}
            />
            {hasActiveFilters && <a href={clearFiltersHref("transacciones")} aria-label="Limpiar filtros" style={{ fontSize: "0.75rem" }}>Limpiar</a>}
          </form>
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
                    <td style={{ textAlign: "right" }}>
                      <DeleteButton
                        id={t.id}
                        action={deleteTransactionAction}
                        label={`${t.description}${t.clientName ? ` (${t.clientName})` : ""} del ${formatDate(t.date)}, ${formatCLP(Number(t.amount))}`}
                      />
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                      {hasActiveFilters
                        ? "No hay transacciones con estos filtros"
                        : "No hay transacciones. Escríbele a tu bot de WhatsApp para registrar un ingreso o gasto."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {transactions.length === 200 && (
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", marginTop: "1rem" }}>
              Mostrando 200 transacciones recientes. Usa los filtros para ver datos más específicos.
            </p>
          )}
        </>
      )}

      {/* CITAS SECTION */}
      {section === "citas" && (
        <>
          <form method="get" className="card filter-form filter-form--compact" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end", justifyContent: "center", marginBottom: "1.5rem", padding: "1.2rem 1.2rem" }}>
            <input type="hidden" name="section" value="citas" />
            <input type="hidden" name="month" value={month} />
            <div className="month-nav-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <a href={monthHref(shiftMonthString(month, -1))} aria-label="Mes anterior" className="btn month-nav-arrow" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>←</a>
              <span className="month-nav-label" style={{ minWidth: "110px", textAlign: "center", fontWeight: 600, fontSize: "0.95rem" }}>{monthLabel(month)}</span>
              <a href={monthHref(shiftMonthString(month, 1))} aria-label="Mes siguiente" className="btn month-nav-arrow" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>→</a>
              {month !== currentMonth && <a href={monthHref(currentMonth)} aria-label="Ir a este mes" className="btn month-nav-today" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Hoy</a>}
              <DateRangeFilter defaultFrom={customFrom} defaultTo={customTo} />
            </div>
            <AppointmentServiceFilter
              defaultValue={params.service ?? "ALL"}
              options={[
                { value: "ALL", label: "Todos" },
                ...APPOINTMENT_CATEGORY_LABELS.map((label) => ({ value: label, label })),
                { value: "Otro", label: "Otro" },
              ]}
            />
            {((params.service && params.service !== "ALL") || hasCustomRange) && <a href={clearFiltersHref("citas")} aria-label="Limpiar filtros" style={{ fontSize: "0.75rem" }}>Limpiar</a>}
          </form>

          <h1 style={{ fontSize: "1rem", margin: "0 0 1rem", color: "var(--text)" }}>Listado de Citas</h1>
          <div className="card" style={{ overflowX: "auto" }}>
            <AppointmentsTable
              rows={(() => {
                const hasServiceFilter = Boolean(params.service && params.service !== "ALL");
                return appointmentsInRange
                  .filter((apt) => !hasServiceFilter || (matchAppointmentCategory(apt.title, apt.description) ?? "Otro") === params.service)
                  .sort((a, b) => b.start.getTime() - a.start.getTime())
                  .map((apt) => ({
                    title: apt.title,
                    description: apt.description,
                    start: apt.start,
                    category: matchAppointmentCategory(apt.title, apt.description) ?? (apt.title || "Sin nombre"),
                  }));
              })()}
              emptyMessage={
                params.service && params.service !== "ALL"
                  ? "No hay citas con este filtro"
                  : "No hay citas este mes. Se sincronizan automáticamente desde tu calendario de Bookly."
              }
            />
          </div>
        </>
      )}
      </div>
      </main>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  flex: "1 1 120px",
  padding: "0.9rem 0.7rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const cardLabelStyle: React.CSSProperties = { fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.4rem" };
const cardValueStyle: React.CSSProperties = { fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 };
const cardSubStyle: React.CSSProperties = { fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" };
