const entregaService = require('../services/entregaService');
const { listarNotificaciones } = require('../services/whatsappService');

/**
 * GET /api/entregas?repartidor_id=X
 * Devuelve los pedidos asignados al repartidor con sus items.
 */
async function listar(req, res) {
  const repartidorId = parseInt(req.query.repartidor_id, 10);

  if (!repartidorId || isNaN(repartidorId)) {
    return res.status(400).json({ error: 'repartidor_id es obligatorio y debe ser un numero.' });
  }

  try {
    const entregas = await entregaService.obtenerEntregasPorRepartidor(repartidorId);
    return res.json(entregas);
  } catch (err) {
    console.error('[Entregas] Error al listar:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

/**
 * PATCH /api/entregas/:pedido_id/estado
 * Body: { nuevo_estado, repartidor_id }
 * Actualiza el estado de una entrega y dispara la notificacion simulada.
 */
async function actualizarEstado(req, res) {
  const pedidoId = parseInt(req.params.pedido_id, 10);
  const { nuevo_estado, repartidor_id } = req.body;

  if (isNaN(pedidoId)) {
    return res.status(400).json({ error: 'ID de pedido invalido.' });
  }
  if (!nuevo_estado || !repartidor_id) {
    return res.status(400).json({ error: 'nuevo_estado y repartidor_id son obligatorios.' });
  }

  try {
    const resultado = await entregaService.actualizarEstadoEntrega(
      pedidoId,
      nuevo_estado,
      repartidor_id
    );
    return res.json({ mensaje: 'Estado actualizado.', entrega: resultado });
  } catch (err) {
    if (err.code === 'NO_ENCONTRADO') return res.status(404).json({ error: err.message });
    if (err.code === 'ACCESO_DENEGADO') return res.status(403).json({ error: err.message });
    if (err.code === 'TRANSICION_INVALIDA') return res.status(409).json({ error: err.message });
    console.error('[Entregas] Error al actualizar estado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/entregas/notificaciones
 * Lista todas las notificaciones WhatsApp simuladas (util para la demo).
 */
async function listarNotificacionesHandler(req, res) {
  try {
    const notificaciones = await listarNotificaciones();
    return res.json(notificaciones);
  } catch (err) {
    console.error('[Notificaciones] Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { listar, actualizarEstado, listarNotificacionesHandler };
