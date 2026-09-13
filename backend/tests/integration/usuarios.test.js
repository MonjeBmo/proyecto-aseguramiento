'use strict';

/**
 * Pruebas de Integracion — Endpoints de Usuarios y Clientes
 *
 * Cubre: POST /api/usuarios, PUT /api/usuarios/:id,
 *        PATCH /api/usuarios/:id/reset-password,
 *        POST /api/clientes, GET /api/clientes
 *
 * ISO 25010 cubierto:
 *   - Adecuacion funcional (Correccion): validaciones de formato rechazadas con 400.
 *   - Safety: payloads de inyeccion SQL son rechazados antes de llegar a la DB.
 *   - Usabilidad: mensaje de error claro por tipo de campo invalido.
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
describe('POST /api/usuarios — validaciones de campo', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve 400 si falta el nombre', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ email: 'nuevo@rutaexpress.gt', rol: 'vendedor' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obligatorio/i);
  });

  test('devuelve 400 si el email no tiene formato valido', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'Juan Lopez', email: 'no-es-email', rol: 'vendedor' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formato/i);
  });

  test('devuelve 400 si el rol no es valido', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'Juan Lopez', email: 'juan@rutaexpress.gt', rol: 'hacker' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rol invalido/i);
  });

  test('devuelve 400 si el nombre tiene menos de 2 caracteres', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'J', email: 'j@rutaexpress.gt', rol: 'vendedor' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 caracteres/i);
  });

  test('crea el usuario correctamente con datos validos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, nombre: 'Juan Lopez', email: 'juan@rutaexpress.gt', rol: 'vendedor' }],
    });

    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'Juan Lopez', email: 'juan@rutaexpress.gt', rol: 'vendedor' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Juan Lopez', rol: 'vendedor' });
  });

  test('devuelve 409 si el email ya esta registrado', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));

    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'Carlos Duplicado', email: 'carlos@rutaexpress.gt', rol: 'vendedor' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya esta registrado/i);
  });

  // Proteccion SQL Injection — el campo email valida formato antes de llegar a la DB
  test.each([
    // Payloads en email: rechazados por regex de email (status 400)
    ['Juan Lopez', "'; DROP TABLE usuarios; --"],
    ['Juan Lopez', "\" UNION SELECT * FROM usuarios --"],
    ['Juan Lopez', "' OR '1'='1"],
  ])('devuelve 400 cuando el email contiene payload SQL: "%s"', async (_nombre, email) => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: 'Juan Lopez', email, rol: 'vendedor' });

    // La validacion de formato de email rechaza cualquier payload malicioso
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formato/i);
  });

  test('un nombre con caracteres especiales se inserta literalmente (query parametrizada, no inyeccion)', async () => {
    // Este nombre contiene caracteres SQL pero pasa validacion de longitud.
    // La proteccion es la query parametrizada: el driver pg lo trata como string literal.
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 11, nombre: "O'Brien Comercial", email: 'obrien@rutaexpress.gt', rol: 'vendedor' }],
    });

    const res = await request(app)
      .post('/api/usuarios')
      .send({ nombre: "O'Brien Comercial", email: 'obrien@rutaexpress.gt', rol: 'vendedor' });

    // Se acepta y se inserta como string literal (sin inyeccion)
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("O'Brien Comercial");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/usuarios/:id/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve 400 si la nueva contrasena tiene menos de 4 caracteres', async () => {
    const res = await request(app)
      .patch('/api/usuarios/1/reset-password')
      .send({ nueva_contrasena: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/4 caracteres/i);
  });

  test('actualiza la contrasena correctamente', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Carlos', email: 'carlos@rutaexpress.gt', rol: 'vendedor' }],
    });

    const res = await request(app)
      .patch('/api/usuarios/1/reset-password')
      .send({ nueva_contrasena: 'nueva1234' });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/actualizada/i);
  });

  test('devuelve 404 si el usuario no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch('/api/usuarios/999/reset-password')
      .send({ nueva_contrasena: 'nueva1234' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/clientes — validaciones de campo', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve 400 si el nombre esta vacio', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre: '', telefono: '5555-1234', zona: 'Zona 1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obligatorio/i);
  });

  test('devuelve 400 si el telefono no tiene formato guatemalteco', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre: 'Tienda Central', telefono: '123', zona: 'Zona 1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/guatemalteco/i);
  });

  test('acepta cliente sin telefono (campo opcional)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, nombre: 'Tienda Sin Tel', telefono: '', zona: 'Zona 2', direccion: '', lat: null, lng: null }],
    });

    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre: 'Tienda Sin Tel', telefono: '', zona: 'Zona 2', direccion: '' });

    expect(res.status).toBe(201);
  });

  test('crea cliente con todos los campos validos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 6, nombre: 'Tienda Nueva', telefono: '5555-9999', zona: 'Zona 7', direccion: '1a Av.', lat: null, lng: null }],
    });

    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre: 'Tienda Nueva', telefono: '5555-9999', zona: 'Zona 7', direccion: '1a Av.' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Tienda Nueva', telefono: '5555-9999' });
  });

  // Proteccion SQL Injection — el campo telefono valida formato antes de llegar a la DB
  test.each([
    ['Tienda OK', "' OR '1'='1"],
    ['Tienda OK', "1; DELETE FROM clientes WHERE 1=1"],
    ['Tienda OK', "'; DROP TABLE clientes; --"],
  ])('devuelve 400 cuando el telefono contiene payload SQL: "%s"', async (nombre, telefono) => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre, telefono, zona: 'Zona 1', direccion: 'Calle 1' });

    // La validacion de formato de telefono GT rechaza cualquier payload malicioso
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/guatemalteco/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/productos — validaciones de campo', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve 400 si el precio es negativo', async () => {
    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Arroz', precio: -5, stock: 100, unidad: 'saco', categoria: 'Granos' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor o igual a 0/i);
  });

  test('devuelve 400 si el stock es negativo', async () => {
    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Arroz', precio: 85, stock: -10, unidad: 'saco', categoria: 'Granos' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mayor o igual a 0/i);
  });

  test('devuelve 400 si el nombre tiene menos de 2 caracteres', async () => {
    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'A', precio: 10, stock: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 caracteres/i);
  });

  test('crea el producto correctamente con datos validos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 11, nombre: 'Arroz Diana', precio: '85.00', stock: 100, unidad: 'saco', categoria: 'Granos', activo: true }],
    });

    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Arroz Diana', descripcion: 'Arroz blanco', precio: 85, stock: 100, unidad: 'saco', categoria: 'Granos' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Arroz Diana' });
  });

  // Proteccion SQL Injection en precio — payloads no numericos son rechazados
  test.each([
    "'; DROP TABLE productos; --",
    "UNION SELECT 1,2,3,4,5,6--",
    // Nota: "1; DELETE..." parseFloat→1, precio valido. Proteccion: query parametrizada.
  ])('devuelve 400 cuando el precio es un payload SQL no numerico: "%s"', async (payload) => {
    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Producto Test', precio: payload, stock: 10 });

    expect(res.status).toBe(400);
  });
});
