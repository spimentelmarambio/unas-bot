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
  defaultScope: string;
  serviceOptions: { value: string; label: string }[];
  // Resumen leaves this out: it always shows the General view, where the
  // negocio and personal figures are both on screen anyway.
  showScope?: boolean;
};

// A plain <select disabled={params.type === "EXPENSE"}> only reflects the
// filter that was already submitted - picking "Gastos" here without
// submitting first left "Servicio" looking selectable even though the
// server ignores it once type is EXPENSE. Tracking both type and service
// client-side keeps them in sync as the user picks, before they hit "Filtrar".
export function TypeServiceFilter({
  defaultType,
  defaultService,
  defaultScope,
  serviceOptions,
  showScope = true,
}: Props) {
  const [type, setType] = useState(defaultType);
  const [service, setService] = useState(defaultService);
  const [scope, setScope] = useState(defaultScope);

  return (
    <div className="type-service-grid">
      <label style={labelStyle}>
        Tipo
        <select
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            e.currentTarget.form?.requestSubmit();
          }}
          className="input"
        >
          <option value="ALL">Todos</option>
          <option value="INCOME">Ingresos</option>
          <option value="EXPENSE">Gastos</option>
        </select>
      </label>
      <label style={labelStyle}>
        Servicio
        <select
          name="service"
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            e.currentTarget.form?.requestSubmit();
          }}
          className="input"
          disabled={type === "EXPENSE"}
        >
          <option value="ALL">Todos</option>
          {serviceOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
      {/* Same reasoning as "Servicio" above, mirrored: income is always the
          business, so filtering it by ámbito can only ever return
          everything or nothing. */}
      {showScope && (
      <label style={labelStyle}>
        Ámbito
        <select
          name="scope"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            e.currentTarget.form?.requestSubmit();
          }}
          className="input"
          disabled={type === "INCOME"}
        >
          {/* "General" rather than "Todos": it's the view where the negocio
              and personal figures sit side by side, not just an absent filter. */}
          <option value="ALL">General</option>
          <option value="BUSINESS">Negocio</option>
          <option value="PERSONAL">Personal</option>
        </select>
      </label>
      )}
    </div>
  );
}
