const pool = require('../config/database');
const { enviarNotificacion } = require('./whatsappService');

// Transiciones de estado validas para el repartidor
const TRANSICIONES_VALIDAS = {
  confirmado: ['despachado'],
  despachado: ['entregado', 'cancelado'],
};

/**
 * Devuelve todos los pedidos asignados a un repartidor,
 * con detalle de cliente e items, ordenados: pendientes primero.
 */
async function obtenerEntregasPorRepartidor(repartidorId) {
  const { rows: pedidos } = await pool.query(
    `SELECT
       p.id, p.estado, p.total, p.creado_en,
       c.id       AS cliente_id,
       c.nombre   AS cliente_nombre,
       c.telefono AS cliente_telefono,
       c.direccion AS cliente_direccion,
       c.zona     AS cliente_zona,
       u.nombre   AS vendedor_nombre
     FROM pedidos p
     JOIN clientes c ON p.cliente_id  = c.id
     JOIN usuarios u ON p.vendedor_id = u.id
     WHERE p.repartidor_id = $1
     ORDER BY
       CASE p.estado
         WHEN 'confirmado' THEN 1
         WHEN 'despachado' THEN 2
         WHEN 'entregado'  THEN 3
         WHEN 'cancelado'  THEN 4
       END,
       p.creado_en DESC`,
    [repartidorId]
  );

  // Para cada pedido, obtener sus items
  const resultado = [];
  for (const pedido of pedidos) {
    const { rows: items } = await pool.query(
      `SELECT pi.cantidad, pi.precio_unitario, pi.subtotal,
              pr.nombre AS producto_nombre, pr.unidad
       FROM pedido_items pi
       JOIN productos pr ON pi.producto_id = pr.id
       WHERE pi.pedido_id = $1`,
      [pedido.id]
    );
    resultado.push({ ...pedido, items });
  }

  return resultado;
}

/**
 * Actualiza el estado de una entrega.
 * Valida que:
 *   - El pedido existe y pertenece a este repartidor.
 *   - La transicion de estado es valida segun el flujo de negocio.
 *
 * Si el nuevo estado es 'entregado', dispara la notificacion simulada por WhatsApp.
 *
 * ISO 25010 — Safety: no permite saltar estados ni retroceder.
 */
async function actualizarEstadoEntrega(pedidoId, nuevoEstado, repartidorId) {
  // 1. Obtener el pedido actual
  const { rows } = await pool.query(
    `SELECT p.id, p.estado, p.repartidor_id,
            c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono
     FROM pedidos p
     JOIN clientes c ON p.cliente_id = c.id
     WHERE p.id = $1`,
    [pedidoId]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error(`Pedido #${pedidoId} no encontrado.`), { code: 'NO_ENCONTRADO' });
  }

  const pedido = rows[0];

  // 2. Verificar que pertenece a este repartidor
  if (pedido.repartidor_id !== repartidorId) {
    throw Object.assign(
      new Error(`El pedido #${pedidoId} no esta asignado a este repartidor.`),
      { code: 'ACCESO_DENEGADO' }
    );
  }

  // 3. Validar transicion de estado
  const transicionesPermitidas = TRANSICIONES_VALIDAS[pedido.estado] || [];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw Object.assign(
      new Error(
        `No se puede pasar de "${pedido.estado}" a "${nuevoEstado}". ` +
        `Transiciones permitidas: [${transicionesPermitidas.join(', ') || 'ninguna'}].`
      ),
      { code: 'TRANSICION_INVALIDA' }
    );
  }

  // 4. Actualizar estado
  await pool.query(
    'UPDATE pedidos SET estado = $1 WHERE id = $2',
    [nuevoEstado, pedidoId]
  );

  // 5. Si fue entregado, simular notificacion WhatsApp al cliente
  if (nuevoEstado === 'entregado') {
    await enviarNotificacion({
      pedidoId,
      clienteId: pedido.cliente_id,
      telefono: pedido.telefono,
      mensaje:
        `Hola ${pedido.cliente_nombre}, tu pedido #${pedidoId} fue entregado exitosamente. ` +
        `Gracias por tu preferencia. — RutaExpress GT`,
    });
  }

  // 6. Si fue cancelado, simular notificacion de fallo
  if (nuevoEstado === 'cancelado') {
    await enviarNotificacion({
      pedidoId,
      clienteId: pedido.cliente_id,
      telefono: pedido.telefono,
      mensaje:
        `Hola ${pedido.cliente_nombre}, no pudimos entregar tu pedido #${pedidoId} hoy. ` +
        `Nos comunicaremos contigo pronto para reprogramar. — RutaExpress GT`,
    });
  }

  return { id: pedidoId, estado: nuevoEstado };
}

module.exports = { obtenerEntregasPorRepartidor, actualizarEstadoEntrega };
