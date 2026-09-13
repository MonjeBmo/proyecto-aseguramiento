'use strict';

/**
 * Pruebas de Integracion — Endpoints de la API
 *
 * Usa supertest para levantar el servidor Express sin un puerto real
 * y mockea el pool de pg para no necesitar una BD en ejecucion.
 *
 * Caracteristica ISO 25010 cubierta:
 *   - Adecuacion funcional: cada endpoint devuelve la respuesta correcta segun el flujo de negocio.
 *   - Safety: el endpoint POST /api/pedidos rechaza pedidos con stock insuficiente.
 */

// ── Mocks de dependencias externas ───────────────────────────────────────────
jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const pool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
    on: jest.fn(),
    _mockClient: mockClient,
  };
  return pool;
});

// Evitar que start() llame a child_process
jest.mock('child_process', () => ({ execSync: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/database');

// Cargar la app DESPUES de los mocks
let app;
beforeAll(async () => {
  // Simular que initSchema y la verificacion inicial no fallan
  pool.query
    .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })  // SELECT 1 (health check)
    .mockResolvedValueOnce({})                               // initSchema (execAsync)
    .mockResolvedValueOnce({ rows: [{ count: '1' }] });     // COUNT usuarios

  // Suprimir logs durante tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  app = require('../../src/index');
  // Dar tiempo al servidor para iniciar
  await new Promise(r => setTimeout(r, 100));
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('devuelve status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/productos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve lista de productos activos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Arroz Diana 25 lb', precio: '85.00', stock: 150, unidad: 'saco', categoria: 'Granos' },
        { id: 2, nombre: 'Aceite Capullo 1L', precio: '28.50', stock: 200, unidad: 'botella', categoria: 'Aceites' },
      ],
    });

    const res = await request(app).get('/api/productos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ nombre: 'Arroz Diana 25 lb', stock: 150 });
  });

  test('devuelve lista vacia si no hay productos', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/productos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('filtra por categoria cuando se pasa como query param', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz Diana 25 lb', stock: 150, categoria: 'Granos' }],
    });

    const res = await request(app).get('/api/productos?categoria=Granos');

    expect(res.status).toBe(200);
    expect(res.body[0].categoria).toBe('Granos');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/pedidos', () => {
  const mockClient = pool._mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  const pedidoValido = {
    cliente_id: 1,
    vendedor_id: 1,
    items: [{ producto_id: 1, cantidad: 2 }],
  };

  test('crea el pedido correctamente y devuelve 201', async () => {
    // verificarStock
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', stock: 150, activo: true }],
    });

    // TX
    mockClient.query
      .mockResolvedValueOnce({})                                           // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                       // cliente
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                       // vendedor
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Arroz', precio: '85.00' }] }) // precio
      .mockResolvedValueOnce({ rows: [{ id: 99, estado: 'confirmado', total: '170.00' }] }) // INSERT pedido
      .mockResolvedValueOnce({})                                           // INSERT item
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ stock: 148 }] })     // UPDATE stock
      .mockResolvedValueOnce({});                                          // COMMIT

    const res = await request(app).post('/api/pedidos').send(pedidoValido);

    expect(res.status).toBe(201);
    expect(res.body.pedido).toMatchObject({ id: 99, estado: 'confirmado' });
    expect(res.body.mensaje).toMatch(/exitosamente/i);
  });

  test('devuelve 409 cuando el stock es insuficiente', async () => {
    // verificarStock falla
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Arroz', stock: 1, activo: true }],
    });

    const res = await request(app)
      .post('/api/pedidos')
      .send({ ...pedidoValido, items: [{ producto_id: 1, cantidad: 999 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Stock insuficiente/i);
  });

  test('devuelve 400 cuando faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({ cliente_id: 1 }); // falta vendedor_id e items

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('devuelve 400 cuando items esta vacio', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({ cliente_id: 1, vendedor_id: 1, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/al menos un producto/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve token y datos del usuario con credenciales validas', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Carlos Revolorio', email: 'carlos@rutaexpress.gt', rol: 'vendedor', password: '1234' }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carlos@rutaexpress.gt', password: '1234' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario).toMatchObject({ email: 'carlos@rutaexpress.gt', rol: 'vendedor' });
    // Verificar que el password NO se incluye en la respuesta (seguridad)
    expect(res.body.usuario.password).toBeUndefined();
  });

  test('devuelve 401 con password incorrecta', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Carlos Revolorio', email: 'carlos@rutaexpress.gt', rol: 'vendedor', password: '1234' }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carlos@rutaexpress.gt', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Credenciales incorrectas/i);
  });

  test('devuelve 400 si falta el email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: '1234' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si el email no tiene formato valido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-un-email', password: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formato/i);
  });
});
