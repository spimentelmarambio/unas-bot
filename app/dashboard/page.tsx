import { getSummary, getTransactions, monthRange } from "@/lib/transactions";
import { getAppointmentStats, fetchAppointments, matchAppointmentCategory, APPOINTMENT_CATEGORY_LABELS } from "@/lib/calendar";
import { santiagoMonthString, shiftMonthString } from "@/lib/dates";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/schemas/message";
import type { NailTransactionType } from "@/lib/generated/prisma/enums";
import { deleteTransactionAction } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { ChatPanel } from "./ChatPanel";
import { TypeServiceFilter } from "./TypeServiceFilter";

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

  // "Limpiar" only drops the type/service filters - it shouldn't also bounce
  // the user back to the current month if they were browsing a past one.
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
          <h2 style={{ fontSize: "0.95rem", margin: "0", color: "var(--text)", fontWeight: 600 }}>💅 MartiNails</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 }}>
          {[
            { id: "resumen", label: "Resumen", icon: "📊" },
            { id: "transacciones", label: "Transacciones", icon: "💰" },
            { id: "citas", label: "Citas", icon: "📅" },
          ].map((item) => (
            <a
              key={item.id}
              href={sectionHref(item.id)}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                backgroundColor: section === item.id ? "var(--pink-bg-2)" : "transparent",
                color: section === item.id ? "var(--accent)" : "var(--text)",
                fontWeight: section === item.id ? 500 : 400,
                fontSize: "0.85rem",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.8rem", marginTop: "1rem" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {[
              { id: "chat", label: "Chat IA", icon: "💬" },
            ].map((item) => (
              <a
                key={item.id}
                href={sectionHref("resumen")}
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "var(--text)",
                  fontWeight: 400,
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: "100%", width: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%", flex: 1 }}>

      {/* RESUMEN SECTION */}
      {section === "resumen" && (
        <>
          <form method="get" className="card filter-form" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end", justifyContent: "center", marginBottom: "2.5rem", padding: "1.2rem 1.2rem" }}>
            <input type="hidden" name="section" value="resumen" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <a href={monthHref(shiftMonthString(month, -1))} aria-label="Mes anterior" className="btn" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>←</a>
              <span style={{ minWidth: "110px", textAlign: "center", fontWeight: 600, fontSize: "0.95rem" }}>{monthLabel(month)}</span>
              <a href={monthHref(shiftMonthString(month, 1))} aria-label="Mes siguiente" className="btn" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>→</a>
            </div>
            <TypeServiceFilter
              defaultType={params.type ?? "ALL"}
              defaultService={params.service ?? "ALL"}
              serviceOptions={SERVICE_TYPES.map((s) => ({ value: s, label: SERVICE_TYPE_LABELS[s] }))}
            />
            <button type="submit" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>Filtrar</button>
            {hasActiveFilters && <a href={clearFiltersHref("resumen")} style={{ fontSize: "0.75rem" }}>Limpiar</a>}
          </form>

          {appointmentStats && (
            <>
              <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "var(--text)", textAlign: "center" }}>📊 Indicadores de Citas</h2>
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
                  <div className="card" style={cardStyle}>
                    <div style={cardLabelStyle}>Neto</div>
                    <div style={{ ...cardValueStyle, color: "var(--accent-dark)" }}>{formatCLP(summary.net)}</div>
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
          <div className="page-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.6rem", margin: "0", color: "var(--text)", fontWeight: 700 }}>Transacciones</h2>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <a href={monthHref(shiftMonthString(month, -1))} aria-label="Mes anterior" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", backgroundColor: "var(--accent-dark)", textDecoration: "none" }}>← Anterior</a>
                <span style={{ minWidth: "120px", textAlign: "center", fontWeight: 600 }}>{monthLabel(month)}</span>
                <a href={monthHref(shiftMonthString(month, 1))} aria-label="Mes siguiente" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", backgroundColor: "var(--accent-dark)", textDecoration: "none" }}>Siguiente →</a>
              </div>
            </div>
          </div>

          <div className="toolbar-row" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "0.8rem", flex: 1 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar transacciones..."
                  style={{ paddingLeft: "2.2rem", width: "100%", opacity: 0.6, cursor: "not-allowed" }}
                  disabled
                  title="Búsqueda disponible próximamente"
                />
                <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)" }}>🔍</span>
              </div>
            </div>
            <button className="btn" style={{ padding: "0.6rem 1.2rem", backgroundColor: "#2f9e63", fontWeight: 600, opacity: 0.6, cursor: "not-allowed" }} disabled title="Disponible próximamente">+ Nueva transacción</button>
          </div>

          <form method="get" className="card filter-form" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1.5rem", padding: "1rem 1.25rem" }}>
            <input type="hidden" name="section" value="transacciones" />
            <TypeServiceFilter
              defaultType={params.type ?? "ALL"}
              defaultService={params.service ?? "ALL"}
              serviceOptions={SERVICE_TYPES.map((s) => ({ value: s, label: SERVICE_TYPE_LABELS[s] }))}
            />
            <button type="submit" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>Filtrar</button>
            {hasActiveFilters && <a href={clearFiltersHref("transacciones")} style={{ fontSize: "0.75rem" }}>Limpiar</a>}
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
                      {hasActiveFilters ? "No hay transacciones con estos filtros" : "No hay transacciones"}
                    </td>
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
          <form method="get" className="card filter-form" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1.5rem", padding: "1rem 1.25rem" }}>
            <input type="hidden" name="section" value="citas" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <a href={monthHref(shiftMonthString(month, -1))} aria-label="Mes anterior" className="btn" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>←</a>
              <a href={monthHref(shiftMonthString(month, 1))} aria-label="Mes siguiente" className="btn" style={{ textDecoration: "none", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>→</a>
            </div>
            <label style={labelStyle}>
              Mes
              <select name="month" defaultValue={month} className="input">
                {[-11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0].map((offset) => {
                  const m = shiftMonthString(month, offset);
                  return <option key={m} value={m}>{monthLabel(m)}</option>;
                })}
              </select>
            </label>
            <label style={labelStyle}>
              Servicio
              <select name="service" defaultValue={params.service ?? "ALL"} className="input">
                <option value="ALL">Todos</option>
                {APPOINTMENT_CATEGORY_LABELS.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
                <option value="Otro">Otro</option>
              </select>
            </label>
            <button type="submit" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>Filtrar</button>
            {params.service && params.service !== "ALL" && <a href={clearFiltersHref("citas")} style={{ fontSize: "0.75rem" }}>Limpiar</a>}
          </form>

          <h2 style={{ fontSize: "1rem", margin: "0 0 1rem", color: "var(--text)" }}>Listado de Citas</h2>
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
                {(() => {
                  const hasServiceFilter = Boolean(params.service && params.service !== "ALL");
                  const filtered = appointmentsThisMonth
                    .filter((apt) => !hasServiceFilter || (matchAppointmentCategory(apt.title, apt.description) ?? "Otro") === params.service)
                    .sort((a, b) => b.start.getTime() - a.start.getTime());
                  return filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                        {hasServiceFilter ? "No hay citas con este filtro" : "No hay citas"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((apt, idx) => (
                      <tr key={`${apt.start.getTime()}-${idx}`}>
                        <td>{formatDate(apt.start)}</td>
                        <td>{formatTime(apt.start)}</td>
                        <td style={{ fontSize: "0.85rem" }} title={apt.title || undefined}>
                          {matchAppointmentCategory(apt.title, apt.description) ?? (apt.title || "Sin nombre")}
                        </td>
                      </tr>
                    ))
                  );
                })()}
              </tbody>
            </table>
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
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.8rem",
  color: "var(--muted)",
  gap: "0.3rem",
};
