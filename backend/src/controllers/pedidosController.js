const pedidoService = require('../services/pedidoService');

/**
 * POST /api/pedidos
 * Recibe un pedido sincronizado desde la app movil.
 * Body: { cliente_id, vendedor_id, items: [{producto_id, cantidad}] }
 */
async function crear(req, res) {
  const { cliente_id, vendedor_id, items } = req.body;

  try {
    const resultado = await pedidoService.crearPedido({ cliente_id, vendedor_id, items });
    return res.status(201).json({
      mensaje: 'Pedido creado exitosamente.',
      pedido: resultado,
    });
  } catch (err) {
    if (err.code === 'DATOS_INCOMPLETOS') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'STOCK_INSUFICIENTE' || err.code === 'STOCK_RACE_CONDITION') {
      return res.status(409).json({ error: err.message });
    }
    if (err.code === 'ENTIDAD_NO_ENCONTRADA') {
      return res.status(404).json({ error: err.message });
    }
    console.error('[Pedidos] Error no controlado:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/pedidos
 * Lista todos los pedidos (para supervision).
 */
async function listar(req, res) {
  const vendedorId = req.query.vendedor_id == null ? null : Number(req.query.vendedor_id);
  if (vendedorId !== null && (!Number.isInteger(vendedorId) || vendedorId <= 0)) {
    return res.status(400).json({ error: 'vendedor_id inválido.' });
  }
  try {
    const pedidos = await pedidoService.obtenerPedidos(vendedorId);
    return res.json(pedidos);
  } catch (err) {
    console.error('[Pedidos] Error al listar:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/pedidos/:id
 * Detalle de un pedido con sus items.
 */
async function obtenerPorId(req, res) {
  const { id } = req.params;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'ID de pedido invalido.' });
  }

  const vendedorId = req.query.vendedor_id == null ? null : Number(req.query.vendedor_id);
  if (vendedorId !== null && (!Number.isInteger(vendedorId) || vendedorId <= 0)) {
    return res.status(400).json({ error: 'vendedor_id inválido.' });
  }
  try {
    const pedido = await pedidoService.obtenerPedidoPorId(id, vendedorId);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    return res.json(pedido);
  } catch (err) {
    console.error('[Pedidos] Error al obtener:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { crear, listar, obtenerPorId };


async function asignarRepartidor(req, res) {
  const id = Number(req.params.id);
  const repartidorId = req.body.repartidor_id;
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ error: 'Selecciona un pedido y un repartidor válidos.' });
  }
  const pool = require('../config/database');
  try {
    const { rows: usuarios } = await pool.query("SELECT id FROM usuarios WHERE id = $1 AND rol = 'repartidor'", [repartidorId]);
    if (!usuarios.length) return res.status(400).json({ error: 'El usuario seleccionado no es repartidor.' });
    const { rowCount } = await pool.query(
      "UPDATE pedidos SET repartidor_id = $1 WHERE id = $2 AND estado = 'confirmado'",
      [repartidorId, id]
    );
    if (!rowCount) return res.status(409).json({ error: 'Solo se pueden asignar o reasignar pedidos pendientes existentes. Actualiza la lista.' });
    return res.json(await pedidoService.obtenerPedidoPorId(id));
  } catch (err) {
    console.error('[Pedidos] Error al asignar:', err);
    return res.status(500).json({ error: 'No se pudo asignar el pedido.' });
  }
}
module.exports.asignarRepartidor = asignarRepartidor;


async function reprogramar(req, res) {
  const id = Number(req.params.id);
  const { repartidor_id, fecha_entrega } = req.body;
  const fecha = typeof fecha_entrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha_entrega)
    ? new Date(`${fecha_entrega}T12:00:00Z`) : new Date(NaN);
  const hoy = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(repartidor_id) || repartidor_id <= 0 ||
      Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== fecha_entrega || fecha_entrega < hoy) {
    return res.status(400).json({ error: 'Selecciona un repartidor y una fecha válida, desde hoy en adelante.' });
  }
  const pool = require('../config/database');
  try {
    const { rows } = await pool.query("SELECT id FROM usuarios WHERE id = $1 AND rol = 'repartidor'", [repartidor_id]);
    if (!rows.length) return res.status(400).json({ error: 'El usuario seleccionado no es repartidor.' });
    const { rowCount } = await pool.query(
      "UPDATE pedidos SET estado = 'confirmado', repartidor_id = $1, fecha_entrega = $2::date WHERE id = $3 AND estado = 'cancelado'",
      [repartidor_id, fecha_entrega, id]
    );
    if (!rowCount) return res.status(409).json({ error: 'Solo se pueden reprogramar pedidos cancelados. Actualiza el detalle.' });
    return res.json(await pedidoService.obtenerPedidoPorId(id));
  } catch (err) {
    console.error('[Pedidos] Error al reprogramar:', err);
    return res.status(500).json({ error: 'No se pudo reprogramar el pedido.' });
  }
}
module.exports.reprogramar = reprogramar;

/**
 * PATCH /api/pedidos/:id/programar
 * Establece o cambia la fecha de entrega (y opcionalmente el repartidor)
 * para cualquier pedido no terminal (confirmado o despachado).
 * No cambia el estado del pedido.
 */
async function programar(req, res) {
  const id = Number(req.params.id);
  const { repartidor_id, fecha_entrega } = req.body;
  const fecha = typeof fecha_entrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha_entrega)
    ? new Date(`${fecha_entrega}T12:00:00Z`) : new Date(NaN);
  const hoy = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);
  if (!Number.isInteger(id) || id <= 0 || Number.isNaN(fecha.getTime()) || fecha_entrega < hoy) {
    return res.status(400).json({ error: 'Selecciona una fecha válida, desde hoy en adelante.' });
  }
  const pool = require('../config/database');
  try {
    if (repartidor_id) {
      const { rows } = await pool.query("SELECT id FROM usuarios WHERE id = $1 AND rol = 'repartidor'", [repartidor_id]);
      if (!rows.length) return res.status(400).json({ error: 'El usuario seleccionado no es repartidor.' });
    }
    const { rowCount } = await pool.query(
      `UPDATE pedidos SET fecha_entrega = $1::date${repartidor_id ? ', repartidor_id = $3' : ''}
       WHERE id = $2 AND estado IN ('confirmado','despachado')`,
      repartidor_id ? [fecha_entrega, id, repartidor_id] : [fecha_entrega, id]
    );
    if (!rowCount) return res.status(409).json({ error: 'Solo se puede programar pedidos pendientes o en camino.' });
    return res.json(await pedidoService.obtenerPedidoPorId(id));
  } catch (err) {
    console.error('[Pedidos] Error al programar:', err);
    return res.status(500).json({ error: 'No se pudo programar el pedido.' });
  }
}
module.exports.programar = programar;
