const pool = require('../config/database');

/**
 * GET /api/productos
 * Lista todos los productos activos con su stock actual.
 */
async function listar(req, res) {
  const { categoria } = req.query;

  let query = `
    SELECT id, nombre, descripcion, precio, stock, unidad, categoria
    FROM productos
    WHERE activo = TRUE
  `;
  const params = [];

  if (categoria) {
    params.push(categoria);
    query += ` AND categoria = $${params.length}`;
  }

  query += ' ORDER BY categoria, nombre';

  const { rows } = await pool.query(query, params);
  return res.json(rows);
}

/**
 * GET /api/productos/:id
 * Devuelve un producto con su stock actual.
 */
async function obtenerPorId(req, res) {
  const { id } = req.params;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'ID de producto invalido.' });
  }

  const { rows } = await pool.query(
    'SELECT id, nombre, descripcion, precio, stock, unidad, categoria FROM productos WHERE id = $1 AND activo = TRUE',
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  return res.json(rows[0]);
}

module.exports = { listar, obtenerPorId };
