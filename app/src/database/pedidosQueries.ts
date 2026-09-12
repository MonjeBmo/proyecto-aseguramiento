import { getDatabase } from './db';

export interface PedidoLocal {
  id?: number;
  cliente_id: number;
  cliente_nombre: string;
  vendedor_id: number;
  vendedor_nombre: string;
  items: string; // JSON stringificado de CartItem[]
  total: number;
  estado: 'pendiente' | 'sincronizado' | 'error';
  creado_en: string;    // ISO 8601
  sincronizado_en?: string; // ISO 8601 | undefined
}

/**
 * Guarda un pedido localmente en SQLite.
 * @returns El ID insertado en la tabla local.
 */
export async function guardarPedido(
  pedido: Omit<PedidoLocal, 'id'>
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO pedidos_pendientes
       (cliente_id, cliente_nombre, vendedor_id, vendedor_nombre,
        items, total, estado, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pedido.cliente_id,
      pedido.cliente_nombre,
      pedido.vendedor_id,
      pedido.vendedor_nombre,
      pedido.items,
      pedido.total,
      pedido.estado,
      pedido.creado_en,
    ]
  );

  return result.lastInsertRowId;
}

/**
 * Devuelve todos los pedidos en estado 'pendiente', ordenados por fecha de creacion.
 */
export async function obtenerPedidosPendientes(): Promise<PedidoLocal[]> {
  const db = await getDatabase();
  return db.getAllAsync<PedidoLocal>(
    `SELECT * FROM pedidos_pendientes WHERE estado = 'pendiente' ORDER BY creado_en ASC`
  );
}

/**
 * Devuelve todos los pedidos (para mostrar historial).
 */
export async function obtenerTodosLosPedidos(): Promise<PedidoLocal[]> {
  const db = await getDatabase();
  return db.getAllAsync<PedidoLocal>(
    `SELECT * FROM pedidos_pendientes ORDER BY creado_en DESC`
  );
}

/**
 * Marca un pedido como sincronizado exitosamente.
 */
export async function marcarSincronizado(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pedidos_pendientes
        SET estado = 'sincronizado', sincronizado_en = ?
      WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

/**
 * Marca un pedido como error de sincronizacion.
 */
export async function marcarError(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pedidos_pendientes SET estado = 'error' WHERE id = ?`,
    [id]
  );
}

/**
 * Cuenta los pedidos pendientes de sincronizar.
 */
export async function contarPendientes(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM pedidos_pendientes WHERE estado = 'pendiente'`
  );
  return row?.total ?? 0;
}
