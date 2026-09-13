let token: string | null = null;
export function guardarToken(value: string | null) { token = value; }
export function cabeceraSesion(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
