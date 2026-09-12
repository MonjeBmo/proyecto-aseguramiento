'use strict';

/**
 * Pruebas Unitarias — entregaService
 *
 * Verifica la logica de transiciones de estado y el disparo de notificaciones.
 * ISO 25010 — Safety: ninguna transicion invalida puede modificar el estado de un pedido.
 */

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

jest.mock('../../src/services/whatsappService', () => ({
  enviarNotificacion: jest.fn().mockResolvedValue(undefined),
}));

const pool = require('../../src/config/database');
const { enviarNotificacion } = require('../../src/services/whatsappService');
const { actualizarEstadoEntrega, obtenerEntregasPorRepartidor } = require('../../src/services/entregaService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('entregaService.actualizarEstadoEntrega — validaciones de Safety', () => {

  test('lanza NO_ENCONTRADO si el pedido no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(actualizarEstadoEntrega(999, 'despachado', 1))
      .rejects.toMatchObject({ code: 'NO_ENCONTRADO' });
  });

  test('lanza ACCESO_DENEGADO si el pedido pertenece a otro repartidor', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, estado: 'confirmado', repartidor_id: 99, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
    });

    await expect(actualizarEstadoEntrega(1, 'despachado', 1))
      .rejects.toMatchObject({ code: 'ACCESO_DENEGADO' });
  });

  test('lanza TRANSICION_INVALIDA si se intenta ir de confirmado a entregado (saltando despachado)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, estado: 'confirmado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
    });

    await expect(actualizarEstadoEntrega(1, 'entregado', 1))
      .rejects.toMatchObject({ code: 'TRANSICION_INVALIDA' });
  });

  test('lanza TRANSICION_INVALIDA si se intenta retroceder de despachado a confirmado', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, estado: 'despachado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
    });

    await expect(actualizarEstadoEntrega(1, 'confirmado', 1))
      .rejects.toMatchObject({ code: 'TRANSICION_INVALIDA' });
  });

  test('lanza TRANSICION_INVALIDA si el pedido ya esta entregado (estado terminal)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, estado: 'entregado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
    });

    await expect(actualizarEstadoEntrega(1, 'despachado', 1))
      .rejects.toMatchObject({ code: 'TRANSICION_INVALIDA' });
  });

  test('actualiza de confirmado a despachado correctamente', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, estado: 'confirmado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
      })
      .mockResolvedValueOnce({}); // UPDATE

    const resultado = await actualizarEstadoEntrega(1, 'despachado', 1);

    expect(resultado).toEqual({ id: 1, estado: 'despachado' });
    expect(enviarNotificacion).not.toHaveBeenCalled(); // solo se llama al entregar/cancelar
  });

  test('actualiza de despachado a entregado y dispara notificacion WhatsApp', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 5, estado: 'despachado', repartidor_id: 1, cliente_id: 2, cliente_nombre: 'Don Juanito', telefono: '5555-1002' }],
      })
      .mockResolvedValueOnce({}); // UPDATE

    const resultado = await actualizarEstadoEntrega(5, 'entregado', 1);

    expect(resultado).toEqual({ id: 5, estado: 'entregado' });
    expect(enviarNotificacion).toHaveBeenCalledTimes(1);
    expect(enviarNotificacion).toHaveBeenCalledWith(
      expect.objectContaining({
        pedidoId: 5,
        clienteId: 2,
        telefono: '5555-1002',
        mensaje: expect.stringContaining('Don Juanito'),
      })
    );
  });

  test('actualiza de despachado a cancelado y dispara notificacion de fallo', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 3, estado: 'despachado', repartidor_id: 1, cliente_id: 3, cliente_nombre: 'La Familia', telefono: '5555-1003' }],
      })
      .mockResolvedValueOnce({}); // UPDATE

    await actualizarEstadoEntrega(3, 'cancelado', 1);

    expect(enviarNotificacion).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: expect.stringContaining('no pudimos entregar'),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('entregaService.obtenerEntregasPorRepartidor', () => {

  test('devuelve lista de entregas con sus items', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 1, estado: 'confirmado', total: '198.50', cliente_id: 1, cliente_nombre: 'Tienda La Esperanza', cliente_telefono: '5555-1001', cliente_direccion: '5a Av.', cliente_zona: 'Zona 6', vendedor_nombre: 'Carlos' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { cantidad: 2, precio_unitario: '85.00', subtotal: '170.00', producto_nombre: 'Arroz Diana 25 lb', unidad: 'saco' },
          { cantidad: 1, precio_unitario: '28.50', subtotal: '28.50',  producto_nombre: 'Aceite Capullo 1L', unidad: 'botella' },
        ],
      });

    const entregas = await obtenerEntregasPorRepartidor(1);

    expect(entregas).toHaveLength(1);
    expect(entregas[0].items).toHaveLength(2);
    expect(entregas[0].cliente_nombre).toBe('Tienda La Esperanza');
    expect(entregas[0].items[0].producto_nombre).toBe('Arroz Diana 25 lb');
  });

  test('devuelve lista vacia si el repartidor no tiene entregas asignadas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const entregas = await obtenerEntregasPorRepartidor(99);
    expect(entregas).toEqual([]);
  });
});
