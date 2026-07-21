"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const encodedCredentials = btoa(`${username}:${password}`);
      const response = await fetch("/dashboard", {
        headers: { Authorization: `Basic ${encodedCredentials}` },
        credentials: "include",
      });

      if (response.ok) {
        window.location.href = "/dashboard";
      } else if (response.status === 401) {
        setError("Usuario o contraseña incorrectos");
      } else {
        setError("Error al iniciar sesión");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, var(--pink-bg) 0%, #fff0f8 100%)",
      padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        boxShadow: "0 10px 40px rgba(217, 83, 138, 0.15)",
        padding: "3rem 2rem",
        maxWidth: "400px",
        width: "100%",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>💅</div>
          <h1 style={{ fontSize: "1.8rem", color: "var(--accent-dark)", margin: 0 }}>MartiNails</h1>
          <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>Dashboard de Gestión</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              className="input"
              style={{ width: "100%", padding: "0.75rem" }}
              disabled={isLoading}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              className="input"
              style={{ width: "100%", padding: "0.75rem" }}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: "#fee",
              color: "#c33",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--muted)", marginTop: "1.5rem" }}>
          © 2026 MartiNails • Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
