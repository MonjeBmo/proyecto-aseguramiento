'use strict';

/**
 * Pruebas de Integracion — Endpoints del Repartidor
 *
 * Cubre: GET /api/entregas, PATCH /api/entregas/:id/estado, GET /api/entregas/notificaciones
 * ISO 25010 — Safety: los endpoints rechazan transiciones invalidas de estado.
 * ISO 25010 — Adecuacion funcional: el flujo de entrega completo (confirmado→despachado→entregado) funciona.
 */

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

jest.mock('child_process', () => ({ execSync: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/database');

let app;
beforeAll(async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ count: '4' }] });

  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  app = require('../../src/index');
  await new Promise(r => setTimeout(r, 100));
});

afterAll(() => jest.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/entregas', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve lista de entregas para el repartidor', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 1, estado: 'confirmado', total: '198.50', cliente_id: 1, cliente_nombre: 'Tienda La Esperanza', cliente_zona: 'Zona 6', cliente_telefono: '5555-1001', cliente_direccion: '5a Av.', vendedor_nombre: 'Carlos' },
          { id: 2, estado: 'despachado', total: '85.00',  cliente_id: 2, cliente_nombre: 'Don Juanito',          cliente_zona: 'Zona 11', cliente_telefono: '5555-1002', cliente_direccion: '12 Calle', vendedor_nombre: 'Maria' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ producto_nombre: 'Arroz', cantidad: 2, subtotal: '170.00', precio_unitario: '85.00', unidad: 'saco' }] })
      .mockResolvedValueOnce({ rows: [{ producto_nombre: 'Frijoles', cantidad: 5, subtotal: '47.50', precio_unitario: '9.50', unidad: 'bolsa' }] });

    const res = await request(app).get('/api/entregas?repartidor_id=1');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].items).toBeDefined();
    expect(res.body[0].cliente_nombre).toBe('Tienda La Esperanza');
  });

  test('devuelve 400 si falta repartidor_id', async () => {
    const res = await request(app).get('/api/entregas');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/repartidor_id/i);
  });

  test('devuelve lista vacia si el repartidor no tiene entregas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/entregas?repartidor_id=99');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/entregas/:pedido_id/estado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('actualiza de confirmado a despachado correctamente', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, estado: 'confirmado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
      })
      .mockResolvedValueOnce({}); // UPDATE

    const res = await request(app)
      .patch('/api/entregas/1/estado')
      .send({ nuevo_estado: 'despachado', repartidor_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.entrega).toMatchObject({ id: 1, estado: 'despachado' });
  });

  test('actualiza de despachado a entregado y devuelve 200', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 2, estado: 'despachado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Don Juanito', telefono: '5555-1002' }],
      })
      .mockResolvedValueOnce({})  // UPDATE pedido
      .mockResolvedValueOnce({}); // INSERT notificacion

    const res = await request(app)
      .patch('/api/entregas/2/estado')
      .send({ nuevo_estado: 'entregado', repartidor_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.entrega.estado).toBe('entregado');
  });

  test('devuelve 409 si la transicion de estado es invalida (saltar pasos)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, estado: 'confirmado', repartidor_id: 1, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
    });

    const res = await request(app)
      .patch('/api/entregas/1/estado')
      .send({ nuevo_estado: 'entregado', repartidor_id: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/TRANSICION_INVALIDA|confirmado|entregado/i);
  });

  test('devuelve 403 si el pedido no pertenece al repartidor', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, estado: 'confirmado', repartidor_id: 99, cliente_id: 1, cliente_nombre: 'Test', telefono: '5555-0000' }],
    });

    const res = await request(app)
      .patch('/api/entregas/1/estado')
      .send({ nuevo_estado: 'despachado', repartidor_id: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no esta asignado/i);
  });

  test('devuelve 404 si el pedido no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch('/api/entregas/999/estado')
      .send({ nuevo_estado: 'despachado', repartidor_id: 1 });

    expect(res.status).toBe(404);
  });

  test('devuelve 400 si falta nuevo_estado', async () => {
    const res = await request(app)
      .patch('/api/entregas/1/estado')
      .send({ repartidor_id: 1 });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/entregas/notificaciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve lista de notificaciones simuladas', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, telefono: '5555-1002', mensaje: 'Tu pedido fue entregado', estado: 'simulado', creado_en: new Date(), cliente_nombre: 'Don Juanito', pedido_id: 5 },
      ],
    });

    const res = await request(app).get('/api/entregas/notificaciones');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ estado: 'simulado', cliente_nombre: 'Don Juanito' });
  });
});
