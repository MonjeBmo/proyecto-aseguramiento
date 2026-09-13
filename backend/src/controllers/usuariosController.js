const pool = require('../config/database');

const ROLES_VALIDOS = ['vendedor', 'supervisor', 'repartidor', 'admin'];
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY rol, nombre'
  );
  return res.json(rows);
}

async function crear(req, res) {
  const { nombre, email, rol } = req.body;
  if (!nombre || !email || !rol) {
    return res.status(400).json({ error: 'Nombre, email y rol son obligatorios.' });
  }
  if (nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
  }
  if (!RE_EMAIL.test(email.trim())) {
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: `Rol invalido. Opciones: ${ROLES_VALIDOS.join(', ')}` });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nombre, email, rol) VALUES ($1, $2, $3) RETURNING id, nombre, email, rol',
      [nombre.trim(), email.toLowerCase().trim(), rol]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya esta registrado.' });
    throw err;
  }
}

async function actualizar(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  const { nombre, rol } = req.body;
  if (!nombre || !rol) return res.status(400).json({ error: 'Nombre y rol son obligatorios.' });
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: `Rol invalido. Opciones: ${ROLES_VALIDOS.join(', ')}` });
  }
  const { rows } = await pool.query(
    'UPDATE usuarios SET nombre=$1, rol=$2 WHERE id=$3 RETURNING id, nombre, email, rol',
    [nombre.trim(), rol, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json(rows[0]);
}

async function resetearContrasena(req, res) {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'ID invalido.' });
  const { nueva_contrasena } = req.body;
  const password = (nueva_contrasena || '').trim();
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres.' });
  }
  const { rows } = await pool.query(
    'UPDATE usuarios SET password=$1 WHERE id=$2 RETURNING id, nombre, email, rol',
    [password, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json({ ...rows[0], mensaje: 'Contrasena actualizada correctamente.' });
}

module.exports = { listar, crear, actualizar, resetearContrasena };
