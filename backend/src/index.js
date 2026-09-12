require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initSchema } = require('./models/schema');
const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const entregasRoutes = require('./routes/entregas');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Registro de peticiones (simple, sin libreria extra)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Rutas ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',      authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos',   pedidosRoutes);
app.use('/api/entregas',  entregasRoutes);

// ── Manejo de errores global ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ── Inicio del servidor ───────────────────────────────────────────────────────
async function start() {
  try {
    // Verificar conexion a la DB
    await pool.query('SELECT 1');
    console.log('[DB] Conexion a PostgreSQL exitosa.');

    // Crear tablas si no existen
    await initSchema();

    // Cargar datos de prueba si la tabla esta vacia
    const { rows } = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(rows[0].count, 10) === 0) {
      console.log('[Seed] Tablas vacias, cargando datos de prueba...');
      // Evitar llamar a seed.js directamente (cierra pool); inline seed basico
      const { execSync } = require('child_process');
      try {
        execSync('node src/config/seed.js', { stdio: 'inherit', cwd: __dirname + '/../..' });
      } catch (_e) {
        console.warn('[Seed] No se pudo auto-seedear. Ejecuta: npm run seed');
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] RutaExpress GT API corriendo en http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] No se pudo iniciar:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app; // exportar para tests
