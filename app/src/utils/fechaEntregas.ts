// Guatemala usa UTC-6 durante todo el año.
export function fechaGuatemala(value: string | Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function fechaValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function moverFecha(value: string, dias: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}
