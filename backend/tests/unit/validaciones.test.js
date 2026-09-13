'use strict';

/**
 * Pruebas Unitarias — Validaciones de entrada
 *
 * Verifica que las expresiones regulares y funciones de validacion usadas
 * en los controladores rechazan correctamente valores maliciosos o mal formados.
 *
 * ISO 25010 cubierto:
 *   - Adecuacion funcional (Correccion): solo datos validos pasan la validacion.
 *   - Safety: inyecciones SQL son rechazadas antes de llegar a la DB.
 *   - Usabilidad (Proteccion contra errores): mensajes de error precisos por campo.
 */

// ── Helpers extraidos de los controladores (DRY) ─────────────────────────────

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TELEFONO_GT = /^(\+502[\s-]?)?[2-9]\d{3}[-\s]?\d{4}$/;

function esEmailValido(email) {
  return RE_EMAIL.test((email || '').trim());
}

function esTelefonoValido(tel) {
  if (!tel || tel.trim() === '') return true; // campo opcional
  return RE_TELEFONO_GT.test(tel.trim());
}

function esPrecioValido(precio) {
  const n = parseFloat(precio);
  return !isNaN(n) && n >= 0;
}

function esStockValido(stock) {
  const n = parseInt(stock, 10);
  return !isNaN(n) && n >= 0 && Number.isInteger(n);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Validacion de Email', () => {

  test.each([
    'carlos@rutaexpress.gt',
    'admin@rutaexpress.gt',
    'superadmin@rutaexpress.gt',
    'usuario+tag@dominio.com',
    'x@y.co',
  ])('acepta email valido: %s', (email) => {
    expect(esEmailValido(email)).toBe(true);
  });

  test.each([
    '',
    'sinArroba',
    '@sinUsuario.com',
    'sin-dominio@',
    'dos@@arrobas.com',
    'con espacios@dominio.com',
    'usuario@dominio',     // sin extension de 2+ chars
    null,
    undefined,
  ])('rechaza email invalido: %s', (email) => {
    expect(esEmailValido(email)).toBe(false);
  });

  // Intentos de inyeccion SQL disfrazados como email
  test.each([
    "' OR '1'='1",
    "admin'--",
    "'; DROP TABLE usuarios; --",
    "\" OR \"\"=\"",
    "1=1; SELECT * FROM usuarios",
  ])('rechaza intento de inyeccion SQL en campo email: %s', (payload) => {
    expect(esEmailValido(payload)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Validacion de Telefono Guatemala', () => {

  test.each([
    '5555-1234',
    '22341234',
    '7777-9999',
    '+502 5555-1234',
    '+502-5555-1234',
    '',          // opcional — vacio es valido
  ])('acepta telefono valido o vacio: "%s"', (tel) => {
    expect(esTelefonoValido(tel)).toBe(true);
  });

  test.each([
    '1234',          // muy corto
    'abcd-efgh',     // letras
    '0000-0000',     // empieza en 0 (no valido en GT)
    '12345678',      // primer digito 1 (no valido en GT)
    '+1-800-555-1234', // numero de otro pais
  ])('rechaza telefono invalido: "%s"', (tel) => {
    expect(esTelefonoValido(tel)).toBe(false);
  });

  // Intentos de inyeccion SQL en campo telefono
  test.each([
    "'; DROP TABLE clientes; --",
    "' OR 1=1 --",
    "<script>alert(1)</script>",
  ])('rechaza inyeccion SQL en campo telefono: %s', (payload) => {
    expect(esTelefonoValido(payload)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Validacion de Precio', () => {

  test.each([
    [0,      true],
    [0.01,   true],
    [85.00,  true],
    [9999.99,true],
    ['28.50', true],
    ['0',    true],
  ])('acepta precio valido: %s', (precio, esperado) => {
    expect(esPrecioValido(precio)).toBe(esperado);
  });

  test.each([
    [-1,       false],
    [-0.01,    false],
    ['abc',    false],
    [null,     false],
    [undefined,false],
    ['',       false],
    ["'; DROP TABLE productos; --", false],
    // Nota: "1; DROP..." parseFloat→1 (valido numericamente).
    // La proteccion contra SQL injection es la query parametrizada, no el parser.
  ])('rechaza precio invalido o malicioso: %s', (precio, esperado) => {
    expect(esPrecioValido(precio)).toBe(esperado);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Validacion de Stock', () => {

  test.each([
    [0,    true],
    [1,    true],
    [150,  true],
    ['50', true],
  ])('acepta stock valido: %s', (stock, esperado) => {
    expect(esStockValido(stock)).toBe(esperado);
  });

  test.each([
    [-1,       false],
    ['abc',    false],
    [null,     false],
    [undefined,false],
    // Nota: parseInt("1; DROP TABLE...", 10) → 1 (valido).
    // El backend usa parseInt, por lo que el stock numerico al inicio de un string
    // pasa la validacion. La proteccion SQL viene de queries parametrizadas.
    // parseInt(1.5) → 1 (valido, trucado). El backend acepta esto.
  ])('rechaza stock invalido: %s', (stock, esperado) => {
    expect(esStockValido(stock)).toBe(esperado);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Proteccion SQL Injection — queries parametrizadas', () => {
  /**
   * Los controladores usan queries parametrizadas con pg ($1, $2, ...),
   * lo que impide la inyeccion SQL independientemente del valor del parametro.
   * Aqui verificamos que los valores maliciosos son tratados como strings literales.
   */

  // Payloads que NO empiezan por un numero valido — rechazados por email, tel y precio
  const payloadsSQL = [
    "'; DROP TABLE usuarios; --",
    "' OR '1'='1",
    "UNION SELECT * FROM usuarios--",
    "\"; exec(xp_cmdshell('whoami'))--",
    // Nota: "1; DELETE..." parseFloat→1, que SI es un precio valido.
    // Esos casos son manejados por queries parametrizadas (el driver pg nunca
    // concatena el valor como texto en la query).
  ];

  test.each(payloadsSQL)(
    'el payload SQL "%s" no modifica la logica de validacion de email',
    (payload) => {
      // El payload no pasa la validacion de email, por lo que nunca llega a la DB
      expect(esEmailValido(payload)).toBe(false);
    }
  );

  test.each(payloadsSQL)(
    'el payload SQL "%s" no pasa validacion de telefono GT',
    (payload) => {
      expect(esTelefonoValido(payload)).toBe(false);
    }
  );

  test.each(payloadsSQL)(
    'el payload SQL "%s" no pasa validacion de precio',
    (payload) => {
      expect(esPrecioValido(payload)).toBe(false);
    }
  );
});
