require('dotenv').config();
const pool = require('./database');
const { initSchema } = require('../models/schema');

const USUARIOS = [
  { nombre: 'Carlos Revolorio', email: 'carlos@rutaexpress.gt', rol: 'vendedor' },
  { nombre: 'Maria Garcia',     email: 'maria@rutaexpress.gt',  rol: 'vendedor' },
  { nombre: 'Admin RutaExpress', email: 'admin@rutaexpress.gt', rol: 'supervisor' },
];

const CLIENTES = [
  { nombre: 'Tienda La Esperanza', telefono: '5555-1001', direccion: '5a Av. 10-20', zona: 'Zona 6' },
  { nombre: 'Despensa Don Juanito', telefono: '5555-1002', direccion: '12 Calle 3-45', zona: 'Zona 11' },
  { nombre: 'Comedor La Familia',   telefono: '5555-1003', direccion: '6a Calle 2-08', zona: 'Zona 1' },
  { nombre: 'Abarrotes El Central', telefono: '5555-1004', direccion: '9a Av. 14-62', zona: 'Zona 3' },
  { nombre: 'Tienda San Miguel',    telefono: '5555-1005', direccion: '3a Calle 7-30', zona: 'Zona 7' },
];

const PRODUCTOS = [
  { nombre: 'Arroz Diana 25 lb',      descripcion: 'Arroz blanco extra largo',     precio: 85.00, stock: 150, unidad: 'saco',    categoria: 'Granos' },
  { nombre: 'Aceite Capullo 1L',       descripcion: 'Aceite vegetal comestible',    precio: 28.50, stock: 200, unidad: 'botella', categoria: 'Aceites' },
  { nombre: 'Azucar Pantaleon 5 lb',   descripcion: 'Azucar blanca refinada',       precio: 22.00, stock: 100, unidad: 'bolsa',   categoria: 'Endulzantes' },
  { nombre: 'Frijoles Negros 1 lb',    descripcion: 'Frijoles negros secos',        precio: 9.50,  stock: 300, unidad: 'bolsa',   categoria: 'Granos' },
  { nombre: 'Sal Refinada 2 lb',       descripcion: 'Sal de cocina yodada',         precio: 4.75,  stock: 250, unidad: 'bolsa',   categoria: 'Condimentos' },
  { nombre: 'Harina Maseca 1 kg',      descripcion: 'Harina de maiz nixtamalizado', precio: 12.00, stock: 80,  unidad: 'bolsa',   categoria: 'Harinas' },
  { nombre: 'Pasta Roma 500g',         descripcion: 'Pasta de trigo spaghetti',     precio: 7.25,  stock: 175, unidad: 'paquete', categoria: 'Pastas' },
  { nombre: 'Atun Van Camps 140g',     descripcion: 'Atun en agua',                 precio: 11.00, stock: 120, unidad: 'lata',    categoria: 'Enlatados' },
  { nombre: 'Sardinas Sultana 425g',   descripcion: 'Sardinas en salsa de tomate',  precio: 18.50, stock: 90,  unidad: 'lata',    categoria: 'Enlatados' },
  { nombre: 'Leche Clover 1L',         descripcion: 'Leche entera pasteurizada',    precio: 15.00, stock: 160, unidad: 'litro',   categoria: 'Lacteos' },
];

async function seed() {
  try {
    await initSchema();

    // Verificar si ya hay datos (idempotente)
    const { rows: existingUsers } = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(existingUsers[0].count, 10) > 0) {
      console.log('[Seed] Datos ya existen, saltando...');
      await pool.end();
      return;
    }

    // Insertar usuarios
    for (const u of USUARIOS) {
      await pool.query(
        'INSERT INTO usuarios (nombre, email, rol) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
        [u.nombre, u.email, u.rol]
      );
    }
    console.log(`[Seed] ${USUARIOS.length} usuarios insertados.`);

    // Insertar clientes
    for (const c of CLIENTES) {
      await pool.query(
        'INSERT INTO clientes (nombre, telefono, direccion, zona) VALUES ($1, $2, $3, $4)',
        [c.nombre, c.telefono, c.direccion, c.zona]
      );
    }
    console.log(`[Seed] ${CLIENTES.length} clientes insertados.`);

    // Insertar productos
    for (const p of PRODUCTOS) {
      await pool.query(
        'INSERT INTO productos (nombre, descripcion, precio, stock, unidad, categoria) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.nombre, p.descripcion, p.precio, p.stock, p.unidad, p.categoria]
      );
    }
    console.log(`[Seed] ${PRODUCTOS.length} productos insertados.`);

    console.log('[Seed] Datos de prueba cargados exitosamente.');
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
