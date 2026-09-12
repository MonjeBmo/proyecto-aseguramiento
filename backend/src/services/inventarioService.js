const pool = require('../config/database');

/**
 * Verifica que todos los items del pedido tengan stock suficiente.
 * Safety ISO 25010: evita sobreventa.
 */
async function verificarStock(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, mensaje: 'La lista de productos no puede estar vacia.' };
  }

  for (const item of items) {
    if (!item.producto_id || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return { ok: false, mensaje: 'Cada item debe tener producto_id valido y cantidad mayor a cero.' };
    }

    const { rows } = await pool.query(
      'SELECT id, nombre, stock, activo FROM productos WHERE id = $1',
      [item.producto_id]
    );

    if (rows.length === 0) {
      return { ok: false, mensaje: `Producto con ID ${item.producto_id} no existe.` };
    }

    const producto = rows[0];

    if (!producto.activo) {
      return { ok: false, mensaje: `El producto "${producto.nombre}" no esta disponible.` };
    }

    if (producto.stock < item.cantidad) {
      return {
        ok: false,
        mensaje: `Stock insuficiente para "${producto.nombre}": disponible ${producto.stock}, solicitado ${item.cantidad}.`,
        producto: producto.nombre,
      };
    }
  }

  return { ok: true };
}

/**
 * Descuenta el stock usando PEPS (Primeras Entradas, Primeras Salidas / FIFO).
 * Si el producto tiene lotes registrados, consume del lote mas antiguo primero.
 * Si no tiene lotes (productos sin gestion PEPS), descuenta directo del stock.
 *
 * Debe llamarse dentro de una transaccion.
 */
async function descontarStock(items, client) {
  for (const item of items) {
    const { producto_id, cantidad } = item;

    // Buscar lotes con stock disponible, orden PEPS (fecha_entrada ASC)
    const { rows: lotes } = await client.query(
      `SELECT id, cantidad_disponible
       FROM lotes
       WHERE producto_id = $1 AND cantidad_disponible > 0
       ORDER BY fecha_entrada ASC, id ASC`,
      [producto_id]
    );

    if (lotes.length > 0) {
      // ── PEPS: consumir del lote mas antiguo primero ──────────────────────────
      let restante = cantidad;

      for (const lote of lotes) {
        if (restante <= 0) break;
        const tomar = Math.min(lote.cantidad_disponible, restante);
        await client.query(
          'UPDATE lotes SET cantidad_disponible = cantidad_disponible - $1 WHERE id = $2',
          [tomar, lote.id]
        );
        restante -= tomar;
      }

      if (restante > 0) {
        throw Object.assign(
          new Error(`Stock insuficiente en lotes PEPS para producto ID ${producto_id}.`),
          { code: 'STOCK_RACE_CONDITION' }
        );
      }

      // Sincronizar stock del producto con la suma real de los lotes
      await client.query(
        `UPDATE productos
            SET stock = (SELECT COALESCE(SUM(cantidad_disponible), 0) FROM lotes WHERE producto_id = $1)
          WHERE id = $1`,
        [producto_id]
      );
    } else {
      // ── Sin lotes: descuento directo con doble verificacion de race condition
      const result = await client.query(
        `UPDATE productos
            SET stock = stock - $1
          WHERE id = $2 AND stock >= $1
          RETURNING id`,
        [cantidad, producto_id]
      );

      if (result.rowCount === 0) {
        throw Object.assign(
          new Error(`Stock insuficiente en la validacion final para producto ID ${producto_id}.`),
          { code: 'STOCK_RACE_CONDITION' }
        );
      }
    }
  }
}

module.exports = { verificarStock, descontarStock };
