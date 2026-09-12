const pool = require('../config/database');

/**
 * Verifica que todos los items del pedido tengan stock suficiente.
 * Esta validacion es el control de Safety ISO 25010: evita sobreventa.
 *
 * @param {Array<{producto_id: number, cantidad: number}>} items
 * @returns {Promise<{ok: boolean, mensaje?: string, producto?: string}>}
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
 * Descuenta el stock de cada producto. Debe llamarse dentro de una transaccion.
 *
 * @param {Array<{producto_id: number, cantidad: number}>} items
 * @param {import('pg').PoolClient} client - cliente de transaccion pg
 */
async function descontarStock(items, client) {
  for (const item of items) {
    const result = await client.query(
      `UPDATE productos
          SET stock = stock - $1
        WHERE id = $2 AND stock >= $1
        RETURNING id, nombre, stock`,
      [item.cantidad, item.producto_id]
    );

    // Doble verificacion: si UPDATE no afecto filas, el stock cayo en carrera
    if (result.rowCount === 0) {
      throw Object.assign(
        new Error(`Stock insuficiente en la validacion final para producto ID ${item.producto_id}.`),
        { code: 'STOCK_RACE_CONDITION' }
      );
    }
  }
}

module.exports = { verificarStock, descontarStock };
