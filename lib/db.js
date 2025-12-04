const { Pool } = require("pg");

// Crear un pool de conexiones reutilizable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Ejecutar una query SQL y devolver las filas
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecutar una query SQL para obtener una sola fila
 */
async function queryOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = {
  query,
  queryOne,
  default: pool,
};

// Cache for detected column names to avoid repeated information_schema queries
const _columnCache = new Map();

/**
 * Detects which column name a table uses from a list of candidates.
 * Returns the first matching column name, or the first candidate if none found.
 * Caches results for the lifetime of the process.
 */
async function detectColumn(tableName, candidates) {
  const key = `${tableName}::${candidates.join(",")}`;
  if (_columnCache.has(key)) return _columnCache.get(key);

  const placeholders = candidates
    .map((c) => `'${c.replace("'", "''")}'`)
    .join(",");
  try {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN (${placeholders}) LIMIT 1`,
      [tableName]
    );
    const found =
      res.rows[0] && res.rows[0].column_name
        ? res.rows[0].column_name
        : candidates[0];
    _columnCache.set(key, found);
    return found;
  } catch (e) {
    // On error, fall back to first candidate
    _columnCache.set(key, candidates[0]);
    return candidates[0];
  }
}

module.exports.detectColumn = detectColumn;
