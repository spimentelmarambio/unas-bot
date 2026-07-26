"use client";

import { useTransition, useState } from "react";
import { askDashboardQuestion } from "./chatActions";

type Props = {
  month: string;
};

type Exchange = { question: string; answer: string };

export function ChatPanel({ month }: Props) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleAsk = () => {
    const asked = question.trim();
    if (!asked) return;
    startTransition(async () => {
      try {
        const response = await askDashboardQuestion(asked, month);
        setHistory((prev) => {
          const updated = [...prev, { question: asked, answer: response }];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });
        setQuestion("");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setHistory((prev) => {
          const updated = [...prev, { question: asked, answer: `Error: ${errorMsg}` }];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });
      }
    });
  };

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "2rem" }}>
      <h2 className="section-title">Consulta IA</h2>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          className="input"
          aria-label="Pregunta para la IA sobre el negocio"
          placeholder="¿Cuánto gané este mes? ¿Cuántas citas en junio?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isPending && handleAsk()}
          disabled={isPending}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={handleAsk} disabled={isPending || !question.trim()} aria-label="Enviar pregunta a la IA">
          {isPending ? "…" : "Preguntar"}
        </button>
      </div>
      {history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", maxHeight: "420px", overflowY: "auto" }}>
          {history.map((exchange, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>{exchange.question}</div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: exchange.answer.startsWith("Error:") ? "rgba(239, 68, 68, 0.1)" : "var(--pink-bg-2)",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  color: exchange.answer.startsWith("Error:") ? "#ef4444" : "var(--text)",
                  lineHeight: 1.5,
                  borderLeft: exchange.answer.startsWith("Error:") ? "3px solid #ef4444" : "none",
                  paddingLeft: exchange.answer.startsWith("Error:") ? "0.7rem" : "1rem",
                }}
              >
                {exchange.answer}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
