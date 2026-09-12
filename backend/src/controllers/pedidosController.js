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
  try {
    const pedidos = await pedidoService.obtenerPedidos();
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

  try {
    const pedido = await pedidoService.obtenerPedidoPorId(id);
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
