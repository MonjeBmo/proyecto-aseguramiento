'use strict';

/**
 * Pruebas Unitarias — pedidoService + inventarioService
 *
 * Se mockea el modulo de base de datos (pg pool) para que las pruebas
 * no necesiten una instancia real de PostgreSQL.
 *
 * Caracteristica ISO 25010 cubierta: Safety — valida que nunca se cree
 * un pedido cuando el stock es insuficiente.
 */

// ── Mock del pool de pg ───────────────────────────────────────────────────────
jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const pool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
    _mockClient: mockClient,
  };
  return pool;
});

const pool = require('../../src/config/database');
const { verificarStock, descontarStock } = require('../../src/services/inventarioService');
const { crearPedido } = require('../../src/services/pedidoService');

// ─────────────────────────────────────────────────────────────────────────────
describe('inventarioService.verificarStock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retorna ok:true cuando hay stock suficiente para todos los items', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Arroz', stock: 150, activo: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, nombre: 'Aceite', stock: 200, activo: true }] });

    const resultado = await verificarStock([
      { producto_id: 1, cantidad: 10 },
      { producto_id: 2, cantidad: 5 },
    ]);

    expect(resultado.ok).toBe(true);
  });

  test('retorna ok:false cuando la cantidad solicitada supera el stock', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', stock: 5, activo: true }],
    });

    const resultado = await verificarStock([{ producto_id: 1, cantidad: 10 }]);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/Stock insuficiente/i);
    expect(resultado.mensaje).toMatch(/Arroz/);
  });

  test('retorna ok:false cuando el producto no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const resultado = await verificarStock([{ producto_id: 999, cantidad: 1 }]);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/no existe/i);
  });

  test('retorna ok:false cuando el producto esta inactivo', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 3, nombre: 'Producto Descontinuado', stock: 100, activo: false }],
    });

    const resultado = await verificarStock([{ producto_id: 3, cantidad: 1 }]);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/no esta disponible/i);
  });

  test('retorna ok:false si la lista de items esta vacia', async () => {
    const resultado = await verificarStock([]);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/no puede estar vacia/i);
  });

  test('retorna ok:false si la cantidad es cero o negativa', async () => {
    const resultado = await verificarStock([{ producto_id: 1, cantidad: 0 }]);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/mayor a cero/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('inventarioService.descontarStock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('descuenta usando PEPS cuando existen lotes disponibles', async () => {
    const mockClient = pool._mockClient;

    // SELECT lotes devuelve un lote con stock suficiente
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 10, cantidad_disponible: 50 }] }) // SELECT lotes
      .mockResolvedValueOnce({})                                               // UPDATE lotes
      .mockResolvedValueOnce({});                                              // UPDATE productos stock

    await descontarStock([{ producto_id: 1, cantidad: 10 }], mockClient);

    // Verifica que se actualizó el lote con PEPS
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE lotes'),
      [10, 10]
    );
    // Verifica que se sincronizó el stock del producto
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE productos'),
      [1]
    );
  });

  test('descuenta directamente del producto cuando no hay lotes registrados', async () => {
    const mockClient = pool._mockClient;

    // SELECT lotes devuelve vacío → ruta sin PEPS
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                                     // SELECT lotes (vacío)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, stock: 140 }] }); // UPDATE productos

    await descontarStock([{ producto_id: 1, cantidad: 10 }], mockClient);

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE productos'),
      [10, 1]
    );
  });

  test('lanza error si UPDATE directo no afecta filas (race condition sin lotes)', async () => {
    const mockClient = pool._mockClient;

    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                    // SELECT lotes (vacío)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });      // UPDATE falla → race condition

    await expect(
      descontarStock([{ producto_id: 1, cantidad: 50 }], mockClient)
    ).rejects.toThrow(/race condition|insuficiente/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pedidoService.crearPedido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lanza error DATOS_INCOMPLETOS si falta cliente_id', async () => {
    await expect(
      crearPedido({ cliente_id: null, vendedor_id: 1, items: [{ producto_id: 1, cantidad: 2 }] })
    ).rejects.toMatchObject({ code: 'DATOS_INCOMPLETOS' });
  });

  test('lanza error DATOS_INCOMPLETOS si items esta vacio', async () => {
    await expect(
      crearPedido({ cliente_id: 1, vendedor_id: 1, items: [] })
    ).rejects.toMatchObject({ code: 'DATOS_INCOMPLETOS' });
  });

  test('lanza error STOCK_INSUFICIENTE si el inventario no alcanza', async () => {
    // Stock insuficiente en la primera verificacion
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', stock: 2, activo: true }],
    });

    await expect(
      crearPedido({
        cliente_id: 1,
        vendedor_id: 1,
        items: [{ producto_id: 1, cantidad: 100 }],
      })
    ).rejects.toMatchObject({ code: 'STOCK_INSUFICIENTE' });
  });

  test('crea el pedido correctamente cuando todos los datos son validos', async () => {
    const mockClient = pool._mockClient;

    // verificarStock pasa
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', stock: 150, activo: true }],
    });

    // TX: BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // cliente existe
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    // vendedor existe
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    // precio del producto
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', precio: '85.00' }],
    });
    // INSERT pedido
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, estado: 'confirmado', total: '850.00' }],
    });
    // INSERT item
    mockClient.query.mockResolvedValueOnce({});
    // descontarStock UPDATE
    mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, stock: 140 }] });
    // COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const resultado = await crearPedido({
      cliente_id: 1,
      vendedor_id: 1,
      items: [{ producto_id: 1, cantidad: 10 }],
    });

    expect(resultado).toMatchObject({
      id: 42,
      estado: 'confirmado',
    });
    expect(resultado.total).toBeCloseTo(850, 0);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('hace ROLLBACK si ocurre un error dentro de la transaccion', async () => {
    const mockClient = pool._mockClient;

    // verificarStock pasa
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', stock: 150, activo: true }],
    });

    // TX: BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // Error al verificar cliente
    mockClient.query.mockRejectedValueOnce(new Error('DB error simulado'));
    // ROLLBACK
    mockClient.query.mockResolvedValueOnce({});

    await expect(
      crearPedido({ cliente_id: 1, vendedor_id: 1, items: [{ producto_id: 1, cantidad: 1 }] })
    ).rejects.toThrow('DB error simulado');

    // Verificar que se llamo ROLLBACK
    const calls = mockClient.query.mock.calls.map(c => c[0]);
    expect(calls).toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
