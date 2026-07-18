export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", margin: 0, color: "var(--accent-dark)" }}>💅 MartiNails</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        El bot de WhatsApp está corriendo en <code>/api/webhook/whatsapp</code>.
      </p>
      <a href="/dashboard" className="btn" style={{ marginTop: "0.5rem", textDecoration: "none" }}>
        Ver dashboard
      </a>
    </main>
  );
}
