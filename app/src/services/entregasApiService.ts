import { Entrega } from '../data/mockData';

const API_URL = 'http://192.168.1.100:3000';
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtiene todas las entregas asignadas al repartidor.
 */
export async function obtenerMisEntregas(repartidorId: number): Promise<Entrega[]> {
  const res = await fetchWithTimeout(
    `${API_URL}/api/entregas?repartidor_id=${repartidorId}`
  );
  if (!res.ok) throw new Error('No se pudieron cargar las entregas.');
  return res.json();
}

export type NuevoEstado = 'despachado' | 'entregado' | 'cancelado';

/**
 * Actualiza el estado de una entrega.
 * Dispara la notificacion WhatsApp simulada en el backend cuando el estado es 'entregado' o 'cancelado'.
 */
export async function actualizarEstadoEntrega(
  pedidoId: number,
  nuevoEstado: NuevoEstado,
  repartidorId: number
): Promise<{ id: number; estado: string }> {
  const res = await fetchWithTimeout(`${API_URL}/api/entregas/${pedidoId}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nuevo_estado: nuevoEstado, repartidor_id: repartidorId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Error al actualizar la entrega.'), {
      status: res.status,
    });
  }

  return data.entrega;
}

/**
 * Lista las notificaciones WhatsApp simuladas (para mostrar en la demo).
 */
export async function obtenerNotificaciones(): Promise<any[]> {
  const res = await fetchWithTimeout(`${API_URL}/api/entregas/notificaciones`);
  if (!res.ok) throw new Error('No se pudieron cargar las notificaciones.');
  return res.json();
}
