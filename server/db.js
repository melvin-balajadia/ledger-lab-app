const { Pool, types } = require('pg');

// pg returns DATE columns (oid 1082) as JS Date objects by default, which
// JSON.stringify then shifts to a UTC timestamp -- a 2026-06-01 DATE silently
// becomes "2026-05-31T16:00:00.000Z" downstream. Force it back to the raw
// 'YYYY-MM-DD' string, matching the old mysql2 `dateStrings: true` behavior.
types.setTypeParser(1082, (val) => val);

// NUMERIC/DECIMAL (oid 1700) already comes back as a string by default in
// `pg` -- no equivalent of mysql2's `decimalNumbers` flag needed. Peso
// amounts up to 1.3B stay strings, never lossy JS floats (CLAUDE.md rule 4).

// mysql2 used `?` positional placeholders; `pg` uses `$1, $2, ...`. Rather
// than hand-renumber ~230 call sites across 17 route files -- several of
// which build WHERE/ORDER/LIMIT clauses dynamically, where a per-callsite
// renumbering is genuinely error-prone -- translate `?` to `$N` once, here,
// for every query issued through this pool or a connection from it. Route
// code everywhere else keeps writing `?`, unchanged.
function toPgSql(text) {
  let n = 0;
  return text.replace(/\?/g, () => `$${++n}`);
}

function wrapQueryable(queryable) {
  const rawQuery = queryable.query.bind(queryable);
  queryable.query = (text, params, callback) => {
    if (typeof text === 'string' && params !== undefined) {
      return rawQuery(toPgSql(text), params, callback);
    }
    return rawQuery(text, params, callback);
  };
  return queryable;
}

const pool = wrapQueryable(
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase requires TLS
    max: 10,
  })
);

// mysql2's manual-transaction API (`getConnection` then `beginTransaction`/
// `commit`/`rollback`) is a different shape than pg's (`connect` then plain
// `BEGIN`/`COMMIT`/`ROLLBACK` statements). Aliased here so every route's
// existing transaction code keeps working without changing per file.
const rawConnect = pool.connect.bind(pool);
pool.getConnection = async () => {
  const client = wrapQueryable(await rawConnect());
  client.beginTransaction = () => client.query('BEGIN');
  client.commit = () => client.query('COMMIT');
  client.rollback = () => client.query('ROLLBACK');
  return client;
};

module.exports = pool;
