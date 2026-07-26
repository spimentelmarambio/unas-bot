"use client";

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.8rem",
  color: "var(--muted)",
  gap: "0.3rem",
};

type Props = {
  defaultValue: string;
  options: { value: string; label: string }[];
};

export function AppointmentServiceFilter({ defaultValue, options }: Props) {
  return (
    <label style={labelStyle}>
      Servicio
      <select
        name="service"
        defaultValue={defaultValue}
        className="input"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
