const API_URL = 'http://localhost:3000';
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

async function apiCall<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithTimeout(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (res.status === 204) return null as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ── Productos ─────────────────────────────────────────────────────────────────

export interface ProductoAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  unidad: string;
  categoria: string;
  activo: boolean;
}

export const productosAdmin = {
  listar: (): Promise<ProductoAdmin[]> =>
    apiCall(`${API_URL}/api/productos/admin/todos`),
  crear: (data: Omit<ProductoAdmin, 'id' | 'activo'>): Promise<ProductoAdmin> =>
    apiCall(`${API_URL}/api/productos`, { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: Omit<ProductoAdmin, 'id' | 'activo'>): Promise<ProductoAdmin> =>
    apiCall(`${API_URL}/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number): Promise<null> =>
    apiCall(`${API_URL}/api/productos/${id}`, { method: 'DELETE' }),
};

// ── Clientes ──────────────────────────────────────────────────────────────────

export interface ClienteAdmin {
  id: number;
  nombre: string;
  telefono: string;
  direccion: string;
  zona: string;
  lat?: number | null;
  lng?: number | null;
}

export const clientesAdmin = {
  listar: (): Promise<ClienteAdmin[]> =>
    apiCall(`${API_URL}/api/clientes`),
  crear: (data: Omit<ClienteAdmin, 'id'>): Promise<ClienteAdmin> =>
    apiCall(`${API_URL}/api/clientes`, { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: Omit<ClienteAdmin, 'id'>): Promise<ClienteAdmin> =>
    apiCall(`${API_URL}/api/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  eliminar: (id: number): Promise<null> =>
    apiCall(`${API_URL}/api/clientes/${id}`, { method: 'DELETE' }),
};

// ── Usuarios ──────────────────────────────────────────────────────────────────

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  rol: 'vendedor' | 'supervisor' | 'repartidor';
  creado_en?: string;
}

export const usuariosAdmin = {
  listar: (): Promise<UsuarioAdmin[]> =>
    apiCall(`${API_URL}/api/usuarios`),
  crear: (data: { nombre: string; email: string; rol: string }): Promise<UsuarioAdmin> =>
    apiCall(`${API_URL}/api/usuarios`, { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string; rol: string }): Promise<UsuarioAdmin> =>
    apiCall(`${API_URL}/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Pedidos ───────────────────────────────────────────────────────────────────

export interface PedidoAdmin {
  id: number;
  estado: string;
  total: number;
  creado_en: string;
  cliente_nombre: string;
  cliente_zona: string;
  vendedor_nombre: string;
}

export interface PedidoDetalle extends PedidoAdmin {
  items: Array<{
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto_nombre: string;
  }>;
}

export const pedidosAdmin = {
  listar: (): Promise<PedidoAdmin[]> =>
    apiCall(`${API_URL}/api/pedidos`),
  obtener: (id: number): Promise<PedidoDetalle> =>
    apiCall(`${API_URL}/api/pedidos/${id}`),
};

// ── Lotes PEPS ────────────────────────────────────────────────────────────────

export interface Lote {
  id: number;
  producto_id: number;
  producto_nombre: string;
  unidad: string;
  cantidad_inicial: number;
  cantidad_disponible: number;
  costo_unitario: number | null;
  fecha_entrada: string;
  notas: string | null;
  creado_en: string;
}

export const lotesAdmin = {
  listar: (producto_id: number): Promise<Lote[]> =>
    apiCall(`${API_URL}/api/lotes?producto_id=${producto_id}`),
  crear: (data: {
    producto_id: number;
    cantidad: number;
    costo_unitario?: number | null;
    fecha_entrada?: string;
    notas?: string;
  }): Promise<Lote> =>
    apiCall(`${API_URL}/api/lotes`, { method: 'POST', body: JSON.stringify(data) }),
  eliminar: (id: number): Promise<null> =>
    apiCall(`${API_URL}/api/lotes/${id}`, { method: 'DELETE' }),
};

// ── Notificaciones ────────────────────────────────────────────────────────────

export interface Notificacion {
  id: number;
  pedido_id: number;
  cliente_id: number;
  telefono: string;
  mensaje: string;
  canal: string;
  estado: string;
  creado_en: string;
}

export const notificacionesAdmin = {
  listar: (): Promise<Notificacion[]> =>
    apiCall(`${API_URL}/api/entregas/notificaciones`),
};
