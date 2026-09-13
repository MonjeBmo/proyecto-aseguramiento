const { Router } = require('express');
const pool = require('../config/database');
const { soloSupervisor } = require('../middleware/sesion');
const router = Router();
router.use(soloSupervisor);
const manejar = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.get('/', manejar(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM proveedores ORDER BY nombre')).rows);
}));
function datos(body) {
  const keys = ['nombre', 'nit', 'telefono', 'email', 'direccion'];
  if (keys.some(k => body[k] != null && typeof body[k] !== 'string')) return null;
  const values = keys.map(k => (body[k] || '').trim());
  return values[0] ? values : null;
}
router.post('/', manejar(async (req, res) => {
  const values = datos(req.body);
  if (!values) return res.status(400).json({ error: 'El nombre es obligatorio y los campos deben ser texto.' });
  res.status(201).json((await pool.query('INSERT INTO proveedores (nombre,nit,telefono,email,direccion) VALUES ($1,$2,$3,$4,$5) RETURNING *', values)).rows[0]);
}));
router.put('/:id', manejar(async (req, res) => {
  const id = Number(req.params.id), values = datos(req.body);
  if (!Number.isInteger(id) || id <= 0 || !values) return res.status(400).json({ error: 'Datos de proveedor inválidos.' });
  const { rows } = await pool.query('UPDATE proveedores SET nombre=$1,nit=$2,telefono=$3,email=$4,direccion=$5 WHERE id=$6 RETURNING *', [...values,id]);
  if (!rows.length) return res.status(404).json({ error: 'Proveedor no encontrado.' });
  res.json(rows[0]);
}));
router.delete('/:id', manejar(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
  try {
    const { rowCount } = await pool.query('DELETE FROM proveedores WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'No se puede eliminar: el proveedor tiene lotes asociados.' });
    throw err;
  }
}));
module.exports = router;
