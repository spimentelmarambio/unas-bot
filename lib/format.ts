export function formatCLP(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
}
