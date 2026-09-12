import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Devuelve la instancia singleton de la base de datos SQLite.
 * Crea el esquema en el primer llamado (idempotente gracias a IF NOT EXISTS).
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('rutaexpress.db');
  await crearEsquema(dbInstance);
  return dbInstance;
}

async function crearEsquema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS pedidos_pendientes (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id       INTEGER NOT NULL,
      cliente_nombre   TEXT    NOT NULL,
      vendedor_id      INTEGER NOT NULL,
      vendedor_nombre  TEXT    NOT NULL,
      items            TEXT    NOT NULL,   -- JSON de CartItem[]
      total            REAL    NOT NULL,
      estado           TEXT    NOT NULL DEFAULT 'pendiente',
                                          -- 'pendiente' | 'sincronizado' | 'error'
      creado_en        TEXT    NOT NULL,   -- ISO 8601
      sincronizado_en  TEXT                -- ISO 8601, null hasta sincronizacion exitosa
    );
  `);
}
