export function formatCLP(amount: number): string {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

// Transaction dates are stored as UTC midnight standing in for a Santiago
// calendar day (see dateOnlyInSantiago), so they have to be read back in UTC
// - formatting them in America/Santiago would shift every one a day earlier.
export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

// Appointments come from the Bookly ICS as real UTC instants, so they must be
// rendered in Chile's timezone. Reading them in UTC showed every appointment
// 3-4 hours late (a 09:00 booking read as 13:00), which also put the salon's
// day at 11:00-23:00 instead of 08:00-19:00.
export function formatAppointmentDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatAppointmentTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
  });
}
