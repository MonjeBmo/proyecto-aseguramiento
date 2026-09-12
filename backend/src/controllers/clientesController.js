const pool = require('../config/database');

async function listar(req, res) {
  const { rows } = await pool.query('SELECT * FROM clientes ORDER BY nombre');
  return res.json(rows);
}

async function obtenerPorId(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
  return res.json(rows[0]);
}

async function crear(req, res) {
  const { nombre, telefono, direccion, zona, lat, lng } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
  const { rows } = await pool.query(
    'INSERT INTO clientes (nombre, telefono, direccion, zona, lat, lng) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [nombre.trim(), telefono || '', direccion || '', zona || '', lat ?? null, lng ?? null]
  );
  return res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  const { nombre, telefono, direccion, zona, lat, lng } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
  const { rows } = await pool.query(
    'UPDATE clientes SET nombre=$1, telefono=$2, direccion=$3, zona=$4, lat=$5, lng=$6 WHERE id=$7 RETURNING *',
    [nombre.trim(), telefono || '', direccion || '', zona || '', lat ?? null, lng ?? null, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
  return res.json(rows[0]);
}

async function eliminar(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  try {
    const { rowCount } = await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
    return res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'No se puede eliminar: el cliente tiene pedidos asociados.' });
    }
    throw err;
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
