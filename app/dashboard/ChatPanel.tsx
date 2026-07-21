"use client";

import { useTransition, useState } from "react";
import { askDashboardQuestion } from "./chatActions";

type Props = {
  month: string;
};

export function ChatPanel({ month }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAsk = () => {
    if (!question.trim()) return;
    startTransition(async () => {
      const response = await askDashboardQuestion(question, month);
      setAnswer(response);
      setQuestion("");
    });
  };

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "2rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 1rem", color: "var(--text)" }}>💬 Consulta IA</h3>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          className="input"
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
      {answer && (
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
          {answer}
        </div>
      )}
    </div>
  );
}
