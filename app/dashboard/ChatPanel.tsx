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
        setHistory((prev) => [...prev, { question: asked, answer: response }]);
        setQuestion("");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setHistory((prev) => [...prev, { question: asked, answer: `Error: ${errorMsg}` }]);
      }
    });
  };

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "2rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 1rem", color: "var(--text)" }}>💬 Consulta IA</h3>
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
        <button className="btn" onClick={handleAsk} disabled={isPending || !question.trim()}>
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
                  backgroundColor: "var(--pink-bg-2)",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text)",
                  lineHeight: 1.5,
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
