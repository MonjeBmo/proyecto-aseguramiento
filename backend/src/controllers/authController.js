const { crearSesion } = require('../middleware/sesion');
const pool = require('../config/database');

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Devuelve: { token, usuario }
 *
 * Las contraseñas se almacenan en la columna `password` de la tabla usuarios.
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return res.status(400).json({ error: 'El formato del correo no es válido.' });
  }

  const { rows } = await pool.query(
    'SELECT id, nombre, email, rol, password FROM usuarios WHERE email = $1',
    [email.toLowerCase()]
  );

  if (rows.length === 0 || rows[0].password !== password) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const { password: _, ...usuario } = rows[0];

  // Sesión opaca con vencimiento para las operaciones protegidas.
  const token = crearSesion(usuario.id);

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
