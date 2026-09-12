const pool = require('../config/database');

async function listar(req, res) {
  const { categoria } = req.query;
  let query = `SELECT id, nombre, descripcion, precio, stock, unidad, categoria, activo
               FROM productos WHERE activo = TRUE`;
  const params = [];
  if (categoria) {
    params.push(categoria);
    query += ` AND categoria = $${params.length}`;
  }
  query += ' ORDER BY categoria, nombre';
  const { rows } = await pool.query(query, params);
  return res.json(rows);
}

async function listarTodos(req, res) {
  const { rows } = await pool.query(
    'SELECT id, nombre, descripcion, precio, stock, unidad, categoria, activo FROM productos ORDER BY nombre'
  );
  return res.json(rows);
}

async function obtenerPorId(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID de producto invalido.' });
  const { rows } = await pool.query(
    'SELECT id, nombre, descripcion, precio, stock, unidad, categoria FROM productos WHERE id = $1 AND activo = TRUE',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
  return res.json(rows[0]);
}

async function crear(req, res) {
  const { nombre, descripcion, precio, stock, unidad, categoria } = req.body;
  if (!nombre || precio === undefined || precio === null) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO productos (nombre, descripcion, precio, stock, unidad, categoria)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [nombre.trim(), descripcion || '', parseFloat(precio), parseInt(stock || 0), unidad || 'unidad', categoria || '']
  );
  return res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  const { nombre, descripcion, precio, stock, unidad, categoria } = req.body;
  if (!nombre || precio === undefined || precio === null) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
  }
  const { rows } = await pool.query(
    `UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, stock=$4, unidad=$5, categoria=$6
     WHERE id=$7 RETURNING *`,
    [nombre.trim(), descripcion || '', parseFloat(precio), parseInt(stock || 0), unidad || 'unidad', categoria || '', id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
  return res.json(rows[0]);
}

async function eliminar(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  const { rowCount } = await pool.query('UPDATE productos SET activo=FALSE WHERE id=$1 AND activo=TRUE', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
  return res.status(204).send();
}

module.exports = { listar, listarTodos, obtenerPorId, crear, actualizar, eliminar };
