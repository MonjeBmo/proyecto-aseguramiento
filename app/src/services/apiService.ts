import { guardarToken } from './sesion';
import { Usuario } from '../data/mockData';

// En web: vacio (rutas relativas; el Worker de Cloudflare proxea /api y /health).
// En Expo Go / nativo: define EXPO_PUBLIC_API_URL en app/.env
// (IP local, http://10.0.2.2:3010 en emulador Android, o la URL del tunel).
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginApi(
  email: string,
  password: string
): Promise<{ token: string; usuario: Usuario }> {
  const res = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error de autenticacion');
  }

  const data = await res.json();
  guardarToken(data.token);
  return data;
}

// ── Productos ─────────────────────────────────────────────────────────────────

export interface ProductoAPI {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  unidad: string;
  categoria: string;
}

export async function obtenerProductos(): Promise<ProductoAPI[]> {
  const res = await fetchWithTimeout(`${API_URL}/api/productos`);

  if (!res.ok) throw new Error('No se pudieron obtener los productos');
  return res.json();
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export interface PedidoPayload {
  cliente_id: number;
  vendedor_id: number;
  items: Array<{ producto_id: number; cantidad: number }>;
}

export interface PedidoRespuesta {
  id: number;
  total: number;
  estado: string;
}

export async function enviarPedido(
  payload: PedidoPayload
): Promise<PedidoRespuesta> {
  const res = await fetchWithTimeout(`${API_URL}/api/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Error al enviar el pedido');
    (err as any).status = res.status;
    throw err;
  }

  return data.pedido;
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export interface ClienteAPI {
  id: number;
  nombre: string;
  telefono: string;
  zona: string;
  direccion: string;
}

export async function obtenerClientes(): Promise<ClienteAPI[]> {
  const res = await fetchWithTimeout(`${API_URL}/api/clientes`);
  if (!res.ok) throw new Error('No se pudieron obtener los clientes');
  return res.json();
}

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
