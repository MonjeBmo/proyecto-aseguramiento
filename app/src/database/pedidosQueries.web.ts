// Implementacion en memoria para web (expo-sqlite no disponible en browser).
// Replica exactamente la interfaz publica de pedidosQueries.ts.

export interface PedidoLocal {
  id?: number;
  cliente_id: number;
  cliente_nombre: string;
  vendedor_id: number;
  vendedor_nombre: string;
  items: string;
  total: number;
  estado: 'pendiente' | 'sincronizado' | 'error';
  creado_en: string;
  sincronizado_en?: string;
}

let nextId = 1;
const store: PedidoLocal[] = [];

export async function guardarPedido(
  pedido: Omit<PedidoLocal, 'id'>
): Promise<number> {
  const id = nextId++;
  store.push({ ...pedido, id });
  return id;
}

export async function obtenerPedidosPendientes(): Promise<PedidoLocal[]> {
  return store
    .filter((p) => p.estado === 'pendiente')
    .sort((a, b) => a.creado_en.localeCompare(b.creado_en));
}

export async function obtenerTodosLosPedidos(): Promise<PedidoLocal[]> {
  return [...store].sort((a, b) => b.creado_en.localeCompare(a.creado_en));
}

export async function marcarSincronizado(id: number): Promise<void> {
  const p = store.find((x) => x.id === id);
  if (p) {
    p.estado = 'sincronizado';
    p.sincronizado_en = new Date().toISOString();
  }
}

export async function marcarError(id: number): Promise<void> {
  const p = store.find((x) => x.id === id);
  if (p) p.estado = 'error';
}

export async function contarPendientes(): Promise<number> {
  return store.filter((p) => p.estado === 'pendiente').length;
}
