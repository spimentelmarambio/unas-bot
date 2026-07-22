"use client";

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  fontSize: "0.8rem",
  color: "var(--muted)",
  gap: "0.3rem",
};

// Jumping to a month 6+ back used to need repeated arrow clicks or picking
// the month then still clicking "Filtrar". Submitting on change makes this
// dropdown behave like the prev/next arrows next to it - one action, done.
export function MonthSelect({
  defaultValue,
  options,
}: {
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={labelStyle}>
      Mes
      <select
        name="month"
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
