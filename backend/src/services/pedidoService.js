const pool = require('../config/database');
const { verificarStock, descontarStock } = require('./inventarioService');

/**
 * Crea un pedido completo en PostgreSQL dentro de una transaccion atomica.
 * Flujo: validar inputs -> verificar stock -> abrir TX -> calcular total
 *         -> insertar pedido -> insertar items -> descontar stock -> COMMIT
 *
 * @param {{cliente_id: number, vendedor_id: number, items: Array}} datos
 * @returns {Promise<{id: number, total: number, estado: string}>}
 */
async function crearPedido({ cliente_id, vendedor_id, items }) {
  // --- Validaciones de entrada ---
  if (!cliente_id || !vendedor_id) {
    throw Object.assign(
      new Error('cliente_id y vendedor_id son obligatorios.'),
      { code: 'DATOS_INCOMPLETOS' }
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(
      new Error('El pedido debe contener al menos un producto.'),
      { code: 'DATOS_INCOMPLETOS' }
    );
  }

  // --- Verificacion de stock previa (lectura rapida antes de TX) ---
  const stockCheck = await verificarStock(items);
  if (!stockCheck.ok) {
    throw Object.assign(new Error(stockCheck.mensaje), { code: 'STOCK_INSUFICIENTE' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que cliente y vendedor existen
    const [clienteRes, vendedorRes] = await Promise.all([
      client.query('SELECT id FROM clientes WHERE id = $1', [cliente_id]),
      client.query('SELECT id FROM usuarios WHERE id = $1 AND rol = $2', [vendedor_id, 'vendedor']),
    ]);

    if (clienteRes.rows.length === 0) {
      throw Object.assign(new Error(`Cliente ID ${cliente_id} no encontrado.`), { code: 'ENTIDAD_NO_ENCONTRADA' });
    }
    if (vendedorRes.rows.length === 0) {
      throw Object.assign(new Error(`Vendedor ID ${vendedor_id} no encontrado.`), { code: 'ENTIDAD_NO_ENCONTRADA' });
    }

    // Calcular total obteniendo precios actuales
    let total = 0;
    const itemsConPrecios = [];

    for (const item of items) {
      const { rows } = await client.query(
        'SELECT id, nombre, precio FROM productos WHERE id = $1 AND activo = TRUE',
        [item.producto_id]
      );
      if (rows.length === 0) {
        throw Object.assign(
          new Error(`Producto ID ${item.producto_id} no disponible.`),
          { code: 'ENTIDAD_NO_ENCONTRADA' }
        );
      }
      const subtotal = parseFloat(rows[0].precio) * item.cantidad;
      total += subtotal;
      itemsConPrecios.push({ ...item, precio_unitario: rows[0].precio, subtotal });
    }

    // Insertar el pedido
    const pedidoResult = await client.query(
      `INSERT INTO pedidos (cliente_id, vendedor_id, estado, total, sincronizado_en)
       VALUES ($1, $2, 'confirmado', $3, NOW())
       RETURNING id, estado, total`,
      [cliente_id, vendedor_id, total.toFixed(2)]
    );
    const pedido = pedidoResult.rows[0];

    // Insertar items del pedido
    for (const item of itemsConPrecios) {
      await client.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal.toFixed(2)]
      );
    }

    // Descontar stock con verificacion de race condition
    await descontarStock(items, client);

    await client.query('COMMIT');

    return { id: pedido.id, total: parseFloat(pedido.total), estado: pedido.estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Devuelve todos los pedidos con nombre de cliente y vendedor.
 */
async function obtenerPedidos(vendedorId = null) {
  const { rows } = await pool.query(`
    SELECT
      p.id,
      p.estado,
      p.total,
      p.creado_en,
      to_char(p.fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega,
      p.sincronizado_en,
      p.repartidor_id,
      r.nombre AS repartidor_nombre,
      c.nombre AS cliente_nombre,
      c.zona   AS cliente_zona,
      u.nombre AS vendedor_nombre
    FROM pedidos p
    JOIN clientes c ON p.cliente_id = c.id
    JOIN usuarios u ON p.vendedor_id = u.id
    LEFT JOIN usuarios r ON p.repartidor_id = r.id
    WHERE ($1::integer IS NULL OR p.vendedor_id = $1)
    ORDER BY p.creado_en DESC
  `, [vendedorId]);
  return rows;
}

/**
 * Devuelve el detalle de un pedido con sus items.
 */
async function obtenerPedidoPorId(id, vendedorId = null) {
  const { rows: pedidoRows } = await pool.query(
    `SELECT p.*, to_char(p.fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega, c.nombre AS cliente_nombre, c.zona AS cliente_zona, u.nombre AS vendedor_nombre, r.nombre AS repartidor_nombre
     FROM pedidos p
     JOIN clientes c ON p.cliente_id = c.id
     JOIN usuarios u ON p.vendedor_id = u.id
    LEFT JOIN usuarios r ON p.repartidor_id = r.id
     WHERE p.id = $1 AND ($2::integer IS NULL OR p.vendedor_id = $2)`,
    [id, vendedorId]
  );

  if (pedidoRows.length === 0) return null;

  const { rows: itemRows } = await pool.query(
    `SELECT pi.*, pr.nombre AS producto_nombre
     FROM pedido_items pi
     JOIN productos pr ON pi.producto_id = pr.id
     WHERE pi.pedido_id = $1`,
    [id]
  );

  return { ...pedidoRows[0], items: itemRows };
}

module.exports = { crearPedido, obtenerPedidos, obtenerPedidoPorId };
