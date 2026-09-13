const { randomBytes } = require('node:crypto');
const pool = require('../config/database');
const sesiones = new Map();

function crearSesion(usuarioId) {
  const ahora = Date.now();
  for (const [token, sesion] of sesiones) if (sesion.expira <= ahora) sesiones.delete(token);
  const token = randomBytes(32).toString('hex');
  sesiones.set(token, { usuarioId, expira: ahora + 12 * 60 * 60 * 1000 });
  return token;
}

// Extrae el usuario de la sesion y lo adjunta a req.sesionUsuarioId (sin bloquear)
function extraerSesion(req, _res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const sesion = sesiones.get(token);
  req.sesionUsuarioId = (sesion && sesion.expira > Date.now()) ? sesion.usuarioId : null;
  next();
}

async function soloSupervisor(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const sesion = sesiones.get(token);
  if (!sesion || sesion.expira <= Date.now()) {
    return res.status(401).json({ error: 'Inicia sesión nuevamente para asignar pedidos.' });
  }
  try {
    const { rows } = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [sesion.usuarioId]);
    if (!['supervisor', 'admin'].includes(rows[0]?.rol)) {
      return res.status(403).json({ error: 'Solo el supervisor puede realizar esta acción.' });
    }
    next();
  } catch (err) { next(err); }
}

async function soloAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const sesion = sesiones.get(token);
  if (!sesion || sesion.expira <= Date.now()) {
    return res.status(401).json({ error: 'Inicia sesión nuevamente.' });
  }
  try {
    const { rows } = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [sesion.usuarioId]);
    if (rows[0]?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede acceder a este recurso.' });
    }
    next();
  } catch (err) { next(err); }
}

module.exports = { crearSesion, extraerSesion, soloSupervisor, soloAdmin, sesiones };
