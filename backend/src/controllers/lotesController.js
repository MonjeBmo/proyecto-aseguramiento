const pool = require('../config/database');

/**
 * GET /api/lotes?producto_id=X
 * Lista los lotes de un producto ordenados PEPS (fecha_entrada ASC).
 */
async function listar(req, res) {
  const { producto_id } = req.query;
  if (!producto_id || isNaN(parseInt(producto_id, 10))) {
    return res.status(400).json({ error: 'producto_id es obligatorio.' });
  }

  const { rows } = await pool.query(
    `SELECT l.*,
            p.nombre AS producto_nombre,
            pr.nombre AS proveedor_nombre,
            p.unidad
     FROM lotes l
     JOIN productos p ON l.producto_id = p.id
     LEFT JOIN proveedores pr ON l.proveedor_id = pr.id
     WHERE l.producto_id = $1
     ORDER BY l.fecha_entrada ASC, l.id ASC`,
    [producto_id]
  );

  return res.json(rows);
}

/**
 * POST /api/lotes
 * Registra una nueva entrada de inventario (lote).
 * Actualiza el stock total del producto.
 */
async function crear(req, res) {
  const { producto_id, cantidad, costo_unitario, fecha_entrada, notas, proveedor_id } = req.body;

  if (!producto_id || !cantidad || parseInt(cantidad, 10) <= 0) {
    return res.status(400).json({ error: 'producto_id y cantidad (> 0) son obligatorios.' });
  }

  const fechaValidar = fecha_entrada == null || fecha_entrada === '' ? null : new Date(`${fecha_entrada}T12:00:00Z`);
  if (fechaValidar && (typeof fecha_entrada !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_entrada) || Number.isNaN(fechaValidar.getTime()) || fechaValidar.toISOString().slice(0,10) !== fecha_entrada)) return res.status(400).json({ error: 'Fecha de entrada inválida.' });
  if (proveedor_id != null) {
    if (!Number.isInteger(proveedor_id) || proveedor_id <= 0) return res.status(400).json({ error: 'Proveedor inválido.' });
    const proveedor = await pool.query('SELECT id FROM proveedores WHERE id=$1', [proveedor_id]);
    if (!proveedor.rows.length) return res.status(400).json({ error: 'Proveedor no encontrado.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: prod } = await client.query(
      'SELECT id, nombre, stock FROM productos WHERE id = $1 AND activo = TRUE',
      [producto_id]
    );
    if (prod.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const cantidadInt = parseInt(cantidad, 10);
    const fechaEntrada = fecha_entrada || new Date().toISOString().split('T')[0];

    const { rows: lote } = await client.query(
      `INSERT INTO lotes (producto_id, cantidad_inicial, cantidad_disponible, costo_unitario, fecha_entrada, notas, proveedor_id)
       VALUES ($1, $2, $2, $3, $4, $5, $6)
       RETURNING *`,
      [producto_id, cantidadInt, costo_unitario ?? null, fechaEntrada, notas || null, proveedor_id ?? null]
    );

    // Incrementar stock del producto
    await client.query(
      'UPDATE productos SET stock = stock + $1 WHERE id = $2',
      [cantidadInt, producto_id]
    );

    await client.query('COMMIT');

    return res.status(201).json(lote[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/lotes/:id
 * Elimina un lote y ajusta el stock del producto.
 * Solo permite eliminar lotes donde cantidad_disponible == cantidad_inicial (no consumidos).
 */
async function eliminar(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM lotes WHERE id = $1', [id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado.' });
    }

    const lote = rows[0];
    if (lote.cantidad_disponible !== lote.cantidad_inicial) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'No se puede eliminar un lote que ya tiene consumos registrados.',
      });
    }

    await client.query('DELETE FROM lotes WHERE id = $1', [id]);
    await client.query(
      'UPDATE productos SET stock = stock - $1 WHERE id = $2',
      [lote.cantidad_inicial, lote.producto_id]
    );

    await client.query('COMMIT');
    return res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listar, crear, eliminar };
