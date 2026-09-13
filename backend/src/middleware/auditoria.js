const pool = require('../config/database');

/**
 * Middleware de auditoría: registra cada petición en la tabla bitacora.
 * Se ejecuta DESPUÉS de que la respuesta es enviada (evento 'finish').
 * Nunca bloquea ni lanza errores al cliente.
 */
function auditoria(req, res, next) {
  const inicio = Date.now();
  res.on('finish', () => {
    try {
      const duracion = Date.now() - inicio;
      const usuario_id = req.sesionUsuarioId ?? null;
      const ip = req.ip || req.socket?.remoteAddress || null;
      const resultado = pool.query(
        'INSERT INTO bitacora (metodo, ruta, usuario_id, estado, duracion_ms, ip) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.method, req.path, usuario_id, res.statusCode, duracion, ip]
      );
      // En entorno de pruebas el pool es un mock que puede devolver undefined
      if (resultado && typeof resultado.catch === 'function') {
        resultado.catch(() => {});
      }
    } catch (_) { /* silencioso */ }
  });
  next();
}

module.exports = auditoria;
