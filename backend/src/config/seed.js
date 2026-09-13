require('dotenv').config();
const pool = require('./database');
const { initSchema } = require('../models/schema');

const USUARIOS = [
  { nombre: 'Carlos Revolorio',  email: 'carlos@rutaexpress.gt',     rol: 'vendedor',    password: '1234' },
  { nombre: 'Maria Garcia',      email: 'maria@rutaexpress.gt',      rol: 'vendedor',    password: '1234' },
  { nombre: 'Admin RutaExpress', email: 'admin@rutaexpress.gt',      rol: 'supervisor',  password: 'admin1234' },
  { nombre: 'Pedro Lopez',       email: 'pedro@rutaexpress.gt',      rol: 'repartidor',  password: '1234' },
  { nombre: 'Super Admin',       email: 'superadmin@rutaexpress.gt', rol: 'admin',       password: 'super1234' },
];

const CLIENTES = [
  { nombre: 'Tienda La Esperanza',  telefono: '5555-1001', direccion: '5a Av. 10-20',  zona: 'Zona 6' },
  { nombre: 'Despensa Don Juanito', telefono: '5555-1002', direccion: '12 Calle 3-45', zona: 'Zona 11' },
  { nombre: 'Comedor La Familia',   telefono: '5555-1003', direccion: '6a Calle 2-08', zona: 'Zona 1' },
  { nombre: 'Abarrotes El Central', telefono: '5555-1004', direccion: '9a Av. 14-62',  zona: 'Zona 3' },
  { nombre: 'Tienda San Miguel',    telefono: '5555-1005', direccion: '3a Calle 7-30', zona: 'Zona 7' },
];

const PRODUCTOS = [
  { nombre: 'Arroz Diana 25 lb',     descripcion: 'Arroz blanco extra largo',      precio: 85.00, stock: 150, unidad: 'saco',    categoria: 'Granos' },
  { nombre: 'Aceite Capullo 1L',     descripcion: 'Aceite vegetal comestible',     precio: 28.50, stock: 200, unidad: 'botella', categoria: 'Aceites' },
  { nombre: 'Azucar Pantaleon 5 lb', descripcion: 'Azucar blanca refinada',        precio: 22.00, stock: 100, unidad: 'bolsa',   categoria: 'Endulzantes' },
  { nombre: 'Frijoles Negros 1 lb',  descripcion: 'Frijoles negros secos',         precio: 9.50,  stock: 300, unidad: 'bolsa',   categoria: 'Granos' },
  { nombre: 'Sal Refinada 2 lb',     descripcion: 'Sal de cocina yodada',          precio: 4.75,  stock: 250, unidad: 'bolsa',   categoria: 'Condimentos' },
  { nombre: 'Harina Maseca 1 kg',    descripcion: 'Harina de maiz nixtamalizado',  precio: 12.00, stock: 80,  unidad: 'bolsa',   categoria: 'Harinas' },
  { nombre: 'Pasta Roma 500g',       descripcion: 'Pasta de trigo spaghetti',      precio: 7.25,  stock: 175, unidad: 'paquete', categoria: 'Pastas' },
  { nombre: 'Atun Van Camps 140g',   descripcion: 'Atun en agua',                  precio: 11.00, stock: 120, unidad: 'lata',    categoria: 'Enlatados' },
  { nombre: 'Sardinas Sultana 425g', descripcion: 'Sardinas en salsa de tomate',   precio: 18.50, stock: 90,  unidad: 'lata',    categoria: 'Enlatados' },
  { nombre: 'Leche Clover 1L',       descripcion: 'Leche entera pasteurizada',     precio: 15.00, stock: 160, unidad: 'litro',   categoria: 'Lacteos' },
];

async function seed() {
  try {
    await initSchema();

    // ── Usuarios (idempotente via ON CONFLICT) ────────────────────────────────
    for (const u of USUARIOS) {
      await pool.query(
        'INSERT INTO usuarios (nombre, email, rol, password) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [u.nombre, u.email, u.rol, u.password]
      );
    }
    console.log(`[Seed] Usuarios: OK`);

    // ── Clientes ──────────────────────────────────────────────────────────────
    const { rows: clientesExistentes } = await pool.query('SELECT COUNT(*) FROM clientes');
    if (parseInt(clientesExistentes[0].count, 10) === 0) {
      for (const c of CLIENTES) {
        await pool.query(
          'INSERT INTO clientes (nombre, telefono, direccion, zona) VALUES ($1, $2, $3, $4)',
          [c.nombre, c.telefono, c.direccion, c.zona]
        );
      }
      console.log(`[Seed] Clientes: ${CLIENTES.length} insertados.`);
    } else {
      console.log('[Seed] Clientes: ya existen, saltando.');
    }

    // ── Productos ─────────────────────────────────────────────────────────────
    const { rows: productosExistentes } = await pool.query('SELECT COUNT(*) FROM productos');
    if (parseInt(productosExistentes[0].count, 10) === 0) {
      for (const p of PRODUCTOS) {
        await pool.query(
          'INSERT INTO productos (nombre, descripcion, precio, stock, unidad, categoria) VALUES ($1, $2, $3, $4, $5, $6)',
          [p.nombre, p.descripcion, p.precio, p.stock, p.unidad, p.categoria]
        );
      }
      console.log(`[Seed] Productos: ${PRODUCTOS.length} insertados.`);
    } else {
      console.log('[Seed] Productos: ya existen, saltando.');
    }

    // ── Pedidos de demo para el Repartidor ────────────────────────────────────
    const { rows: pedidosExistentes } = await pool.query('SELECT COUNT(*) FROM pedidos');
    if (parseInt(pedidosExistentes[0].count, 10) === 0) {
      const { rows: vendedores }    = await pool.query("SELECT id FROM usuarios WHERE email = 'carlos@rutaexpress.gt'");
      const { rows: repartidores }  = await pool.query("SELECT id FROM usuarios WHERE email = 'pedro@rutaexpress.gt'");
      const { rows: clientesRows }  = await pool.query('SELECT id FROM clientes ORDER BY id');
      const { rows: productosRows } = await pool.query('SELECT id, precio FROM productos ORDER BY id');

      if (vendedores.length && repartidores.length && clientesRows.length >= 3) {
        const vendedorId    = vendedores[0].id;
        const repartidorId  = repartidores[0].id;

        const PEDIDOS_DEMO = [
          {
            clienteIdx: 0, // Tienda La Esperanza
            estado: 'confirmado',
            items: [
              { productoIdx: 0, cantidad: 2 }, // Arroz x2
              { productoIdx: 1, cantidad: 3 }, // Aceite x3
            ],
          },
          {
            clienteIdx: 1, // Despensa Don Juanito
            estado: 'despachado',
            items: [
              { productoIdx: 3, cantidad: 5 }, // Frijoles x5
              { productoIdx: 4, cantidad: 4 }, // Sal x4
            ],
          },
          {
            clienteIdx: 2, // Comedor La Familia
            estado: 'confirmado',
            items: [
              { productoIdx: 6, cantidad: 6 }, // Pasta x6
              { productoIdx: 7, cantidad: 4 }, // Atun x4
              { productoIdx: 2, cantidad: 2 }, // Azucar x2
            ],
          },
        ];

        for (const demo of PEDIDOS_DEMO) {
          const cliente = clientesRows[demo.clienteIdx];
          let total = 0;
          const itemsConPrecios = demo.items.map(item => {
            const producto = productosRows[item.productoIdx];
            const subtotal = parseFloat(producto.precio) * item.cantidad;
            total += subtotal;
            return { productoId: producto.id, cantidad: item.cantidad, precio: producto.precio, subtotal };
          });

          const { rows: pedidoInserted } = await pool.query(
            `INSERT INTO pedidos (cliente_id, vendedor_id, repartidor_id, estado, total)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [cliente.id, vendedorId, repartidorId, demo.estado, total.toFixed(2)]
          );
          const pedidoId = pedidoInserted[0].id;

          for (const item of itemsConPrecios) {
            await pool.query(
              `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
               VALUES ($1, $2, $3, $4, $5)`,
              [pedidoId, item.productoId, item.cantidad, item.precio, item.subtotal.toFixed(2)]
            );
          }
        }
        console.log(`[Seed] Pedidos de demo para repartidor: ${PEDIDOS_DEMO.length} insertados.`);
      }
    } else {
      console.log('[Seed] Pedidos: ya existen, saltando.');
    }

    console.log('[Seed] Completado exitosamente.');
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
