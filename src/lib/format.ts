export const money = (n: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(n);
export function dateLabel(value: string) {
  const d = new Date(value.length === 10 ? `${value}T12:00:00+04:00` : value);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("en-AE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dubai",
        ...(value.length > 10 ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(d);
}
export const dubaiTime = () =>
  new Intl.DateTimeFormat("en-AE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  }).format(new Date());
