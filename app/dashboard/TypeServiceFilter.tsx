"use client";

import { useState } from "react";

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.8rem",
  color: "var(--muted)",
  gap: "0.3rem",
};

type Props = {
  defaultType: string;
  defaultService: string;
  serviceOptions: { value: string; label: string }[];
};

// A plain <select disabled={params.type === "EXPENSE"}> only reflects the
// filter that was already submitted - picking "Gastos" here without
// submitting first left "Servicio" looking selectable even though the
// server ignores it once type is EXPENSE. Tracking "type" client-side keeps
// the two in sync as the user picks, before they hit "Filtrar".
export function TypeServiceFilter({ defaultType, defaultService, serviceOptions }: Props) {
  const [type, setType] = useState(defaultType);

  return (
    <>
      <label style={labelStyle}>
        Tipo
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input">
          <option value="ALL">Todos</option>
          <option value="INCOME">Ingresos</option>
          <option value="EXPENSE">Gastos</option>
        </select>
      </label>
      <label style={labelStyle}>
        Servicio
        <select name="service" defaultValue={defaultService} className="input" disabled={type === "EXPENSE"}>
          <option value="ALL">Todos</option>
          {serviceOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
    </>
  );
}
