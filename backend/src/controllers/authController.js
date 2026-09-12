const pool = require('../config/database');

// Usuarios mock para el prototipo (sin hash de contrasena real)
const CREDENCIALES_MOCK = {
  'carlos@rutaexpress.gt': '1234',
  'maria@rutaexpress.gt':  '1234',
  'admin@rutaexpress.gt':  'admin1234',
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Devuelve: { token, usuario }
 *
 * Para el prototipo se simula un JWT como string simple.
 * En produccion se reemplaza por jsonwebtoken con firma real.
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios.' });
  }

  const passwordEsperado = CREDENCIALES_MOCK[email.toLowerCase()];
  if (!passwordEsperado || passwordEsperado !== password) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const { rows } = await pool.query(
    'SELECT id, nombre, email, rol FROM usuarios WHERE email = $1',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Usuario no encontrado en la base de datos.' });
  }

  const usuario = rows[0];

  // Token simulado: base64(id:email:timestamp)
  const token = Buffer.from(`${usuario.id}:${usuario.email}:${Date.now()}`).toString('base64');

  return res.json({ token, usuario });
}

/**
 * GET /api/auth/usuarios
 * Devuelve la lista de vendedores activos (para la seleccion en la app).
 */
async function listarVendedores(req, res) {
  const { rows } = await pool.query(
    "SELECT id, nombre, email, rol FROM usuarios WHERE rol = 'vendedor' ORDER BY nombre"
  );
  return res.json(rows);
}

module.exports = { login, listarVendedores };
