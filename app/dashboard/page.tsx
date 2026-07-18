import { getMonthlySummary, getRecentTransactions } from "@/lib/transactions";

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

export default async function DashboardPage() {
  const [summary, transactions] = await Promise.all([
    getMonthlySummary(),
    getRecentTransactions(100),
  ]);

  return (
    <main style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Uñas — Dashboard</h1>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Ingresos este mes</div>
          <div style={{ ...cardValueStyle, color: "#1a7f37" }}>{formatCLP(summary.incomeTotal)}</div>
          <div style={cardSubStyle}>{summary.incomeCount} servicios</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Gastos este mes</div>
          <div style={{ ...cardValueStyle, color: "#cf222e" }}>{formatCLP(summary.expenseTotal)}</div>
          <div style={cardSubStyle}>{summary.expenseCount} movimientos</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Neto este mes</div>
          <div style={cardValueStyle}>{formatCLP(summary.net)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Movimientos recientes</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}>Descripción</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{formatDate(t.date)}</td>
              <td style={tdStyle}>
                {t.description}
                {t.clientName ? ` (${t.clientName})` : ""}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  color: t.type === "INCOME" ? "#1a7f37" : "#cf222e",
                }}
              >
                {t.type === "INCOME" ? "+" : "-"}
                {formatCLP(Number(t.amount))}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={3}>
                Todavía no hay movimientos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  flex: "1 1 160px",
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "0.75rem 1rem",
};

const cardLabelStyle: React.CSSProperties = { fontSize: "0.8rem", color: "#666" };
const cardValueStyle: React.CSSProperties = { fontSize: "1.4rem", fontWeight: 600 };
const cardSubStyle: React.CSSProperties = { fontSize: "0.75rem", color: "#888" };
const thStyle: React.CSSProperties = { padding: "0.4rem 0.5rem", fontSize: "0.85rem" };
const tdStyle: React.CSSProperties = { padding: "0.4rem 0.5rem", fontSize: "0.9rem" };
