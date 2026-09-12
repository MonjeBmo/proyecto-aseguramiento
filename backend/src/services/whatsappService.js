const pool = require('../config/database');

/**
 * Stub de notificacion por WhatsApp.
 *
 * En produccion se reemplaza el cuerpo de esta funcion por una llamada
 * real a Meta Cloud API (WhatsApp Business) sin modificar ningun otro modulo.
 * Esto sustenta Mantenibilidad en ISO 25010 — arquitectura desacoplada.
 *
 * Por ahora:
 *  1. Guarda el registro en la tabla `notificaciones` con estado 'simulado'.
 *  2. Imprime el mensaje en consola para que sea visible en la demo.
 *
 * @param {{ pedidoId: number, clienteId: number, telefono: string, mensaje: string }} params
 */
async function enviarNotificacion({ pedidoId, clienteId, telefono, mensaje }) {
  await pool.query(
    `INSERT INTO notificaciones (pedido_id, cliente_id, telefono, mensaje, canal, estado)
     VALUES ($1, $2, $3, $4, 'whatsapp', 'simulado')`,
    [pedidoId, clienteId, telefono, mensaje]
  );

  // Log visible en la consola del backend durante la demo
  console.log(`\n[WhatsApp SIMULADO] ─────────────────────────────`);
  console.log(`  Para  : ${telefono}`);
  console.log(`  Pedido: #${pedidoId}`);
  console.log(`  Msg   : ${mensaje}`);
  console.log(`─────────────────────────────────────────────────\n`);
}

/**
 * Lista todas las notificaciones simuladas (util para mostrar en la demo).
 */
async function listarNotificaciones() {
  const { rows } = await pool.query(`
    SELECT n.id, n.telefono, n.mensaje, n.estado, n.creado_en,
           c.nombre AS cliente_nombre,
           p.id     AS pedido_id
    FROM notificaciones n
    JOIN clientes c ON n.cliente_id = c.id
    JOIN pedidos  p ON n.pedido_id  = p.id
    ORDER BY n.creado_en DESC
  `);
  return rows;
}

module.exports = { enviarNotificacion, listarNotificaciones };
