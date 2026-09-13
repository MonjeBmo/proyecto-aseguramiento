const pool = require('../config/database');

function coordenadasValidas(lat, lng) {
  if (lat == null && lng == null) return true;
  return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
}

// Acepta formatos guatemaltecos: 4444-4444, 44444444, +502 44444444
const RE_TELEFONO_GT = /^(\+502[\s-]?)?[2-9]\d{3}[-\s]?\d{4}$/;
function telefonoValido(tel) {
  if (!tel || tel.trim() === '') return true; // opcional
  return RE_TELEFONO_GT.test(tel.trim());
}

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
  if (!nombre || nombre.trim().length < 2) return res.status(400).json({ error: 'El nombre del cliente es obligatorio (mín. 2 caracteres).' });
  if (!telefonoValido(telefono)) return res.status(400).json({ error: 'El teléfono debe ser un número guatemalteco válido (ej. 5555-1234).' });
  if (!coordenadasValidas(lat, lng)) return res.status(400).json({ error: 'Latitud y longitud deben ser coordenadas válidas y enviarse juntas.' });
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
  if (!nombre || nombre.trim().length < 2) return res.status(400).json({ error: 'El nombre del cliente es obligatorio (mín. 2 caracteres).' });
  if (!telefonoValido(telefono)) return res.status(400).json({ error: 'El teléfono debe ser un número guatemalteco válido (ej. 5555-1234).' });
  if (!coordenadasValidas(lat, lng)) return res.status(400).json({ error: 'Latitud y longitud deben ser coordenadas válidas y enviarse juntas.' });
  const { rows } = await pool.query(
    'UPDATE clientes SET nombre=$1, telefono=$2, direccion=$3, zona=$4, lat=CASE WHEN $8 THEN $5 ELSE lat END, lng=CASE WHEN $8 THEN $6 ELSE lng END WHERE id=$7 RETURNING *',
    [nombre.trim(), telefono || '', direccion || '', zona || '', lat ?? null, lng ?? null, id, lat !== undefined || lng !== undefined]
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
