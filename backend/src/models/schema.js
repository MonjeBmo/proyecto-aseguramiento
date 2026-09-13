const pool = require('../config/database');

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id        SERIAL PRIMARY KEY,
    nombre    TEXT NOT NULL,
    email     TEXT UNIQUE NOT NULL,
    rol       TEXT NOT NULL CHECK (rol IN ('vendedor', 'supervisor', 'repartidor')),
    creado_en TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id        SERIAL PRIMARY KEY,
    nombre    TEXT NOT NULL,
    telefono  TEXT,
    direccion TEXT,
    zona      TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS productos (
    id          SERIAL PRIMARY KEY,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    precio      NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unidad      TEXT DEFAULT 'unidad',
    categoria   TEXT,
    activo      BOOLEAN DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
    vendedor_id     INTEGER NOT NULL REFERENCES usuarios(id),
    repartidor_id   INTEGER REFERENCES usuarios(id),
    estado          TEXT NOT NULL DEFAULT 'confirmado'
                      CHECK (estado IN ('confirmado', 'despachado', 'entregado', 'cancelado')),
    total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    creado_en       TIMESTAMP DEFAULT NOW(),
    sincronizado_en TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS pedido_items (
    id              SERIAL PRIMARY KEY,
    pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
  );

  CREATE TABLE IF NOT EXISTS proveedores (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nit TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    direccion TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS lotes (
    id                  SERIAL PRIMARY KEY,
    producto_id         INTEGER NOT NULL REFERENCES productos(id),
    cantidad_inicial    INTEGER NOT NULL CHECK (cantidad_inicial > 0),
    cantidad_disponible INTEGER NOT NULL CHECK (cantidad_disponible >= 0),
    costo_unitario      NUMERIC(10,2),
    fecha_entrada       DATE NOT NULL DEFAULT CURRENT_DATE,
    notas               TEXT,
    creado_en           TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS notificaciones (
    id         SERIAL PRIMARY KEY,
    pedido_id  INTEGER NOT NULL REFERENCES pedidos(id),
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    telefono   TEXT NOT NULL,
    mensaje    TEXT NOT NULL,
    canal      TEXT NOT NULL DEFAULT 'whatsapp',
    estado     TEXT NOT NULL DEFAULT 'simulado'
                 CHECK (estado IN ('simulado', 'enviado', 'error')),
    creado_en  TIMESTAMP DEFAULT NOW()
  );

  ALTER TABLE lotes ADD COLUMN IF NOT EXISTS proveedor_id INTEGER REFERENCES proveedores(id);
  ALTER TABLE pedidos   ADD COLUMN IF NOT EXISTS fecha_entrega DATE;
  ALTER TABLE pedidos   ADD COLUMN IF NOT EXISTS repartidor_id INTEGER REFERENCES usuarios(id);
  ALTER TABLE clientes  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
  ALTER TABLE clientes  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
  ALTER TABLE usuarios  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '1234';
  UPDATE usuarios SET password = 'admin1234' WHERE rol = 'supervisor' AND (password IS NULL OR password = '1234');
  UPDATE usuarios SET password = '1234' WHERE password IS NULL;

  -- Ampliar el CHECK de roles para incluir 'admin'
  ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
  ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('vendedor', 'supervisor', 'repartidor', 'admin'));

  -- Tabla de auditoría de peticiones API
  CREATE TABLE IF NOT EXISTS bitacora (
    id          SERIAL PRIMARY KEY,
    timestamp   TIMESTAMP DEFAULT NOW(),
    metodo      VARCHAR(10) NOT NULL,
    ruta        TEXT NOT NULL,
    usuario_id  INTEGER,
    estado      INTEGER,
    duracion_ms INTEGER,
    ip          TEXT
  );
`;

async function initSchema() {
  try {
    await pool.query(SCHEMA_SQL);
    console.log('[DB] Esquema inicializado correctamente.');
  } catch (err) {
    console.error('[DB] Error al inicializar esquema:', err.message);
    throw err;
  }
}

module.exports = { initSchema };
