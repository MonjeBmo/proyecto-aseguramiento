import { enviarPedido } from './apiService';
import {
  obtenerPedidosPendientes,
  marcarSincronizado,
  marcarError,
} from '../database/pedidosQueries';

export interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

/**
 * Intenta sincronizar un pedido recien guardado de forma inmediata.
 * Usado cuando el vendedor tiene conexion al confirmar.
 *
 * @param localId - ID del pedido en SQLite
 * @param payload - Datos a enviar al backend
 */
export async function sincronizarPedidoInmediato(
  localId: number,
  payload: { cliente_id: number; vendedor_id: number; items: CartItem[] }
): Promise<number | null> {
  try {
    const respuesta = await enviarPedido({
      cliente_id: payload.cliente_id,
      vendedor_id: payload.vendedor_id,
      items: payload.items.map((item) => ({
        producto_id: item.productoId,
        cantidad: item.cantidad,
      })),
    });
    await marcarSincronizado(localId);
    return respuesta.id;
  } catch (err) {
    // No se pudo sincronizar; el pedido queda en estado 'pendiente'
    // y se reintentara cuando el syncService detecte conexion
    console.warn('[Sync] No se pudo sincronizar inmediatamente:', (err as Error).message);
    return null;
  }
}

/**
 * Sincroniza todos los pedidos pendientes en SQLite.
 * Llamado automaticamente cuando se recupera la conexion (via AppContext.syncTrigger).
 *
 * @returns { sincronizados, errores }
 */
export async function sincronizarPendientes(): Promise<{
  sincronizados: number;
  errores: number;
}> {
  const pendientes = await obtenerPedidosPendientes();
  let sincronizados = 0;
  let errores = 0;

  for (const pedido of pendientes) {
    try {
      const items: CartItem[] = JSON.parse(pedido.items);

      await enviarPedido({
        cliente_id: pedido.cliente_id,
        vendedor_id: pedido.vendedor_id,
        items: items.map((item) => ({
          producto_id: item.productoId,
          cantidad: item.cantidad,
        })),
      });

      if (pedido.id !== undefined) {
        await marcarSincronizado(pedido.id);
      }
      sincronizados++;
    } catch (err) {
      console.error(
        `[Sync] Error sincronizando pedido local ID ${pedido.id}:`,
        (err as Error).message
      );
      if (pedido.id !== undefined) {
        await marcarError(pedido.id);
      }
      errores++;
    }
  }

  if (sincronizados > 0 || errores > 0) {
    console.log(`[Sync] Resultado: ${sincronizados} sincronizados, ${errores} con error.`);
  }

  return { sincronizados, errores };
}
