const { Router } = require('express');
const { soloAdmin } = require('../middleware/sesion');
const pool = require('../config/database');

const router = Router();

router.get('/', soloAdmin, async (req, res) => {
  try {
    const { fecha, metodo, ruta } = req.query;
    const conditions = [];
    const params = [];

    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      params.push(fecha);
      conditions.push(`DATE(b.timestamp AT TIME ZONE 'America/Guatemala') = $${params.length}`);
    }
    if (metodo && ['GET','POST','PUT','PATCH','DELETE'].includes(metodo.toUpperCase())) {
      params.push(metodo.toUpperCase());
      conditions.push(`b.metodo = $${params.length}`);
    }
    if (ruta) {
      params.push(`%${ruta}%`);
      conditions.push(`b.ruta ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT b.id, b.timestamp, b.metodo, b.ruta, b.estado, b.duracion_ms, b.ip,
              u.nombre AS usuario_nombre, u.rol AS usuario_rol
       FROM bitacora b
       LEFT JOIN usuarios u ON b.usuario_id = u.id
       ${where}
       ORDER BY b.timestamp DESC
       LIMIT 500`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Bitacora] Error:', err);
    return res.status(500).json({ error: 'Error al obtener la bitácora.' });
  }
});

module.exports = router;
