import { Pool, QueryResult, QueryResultRow } from 'pg';

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create the PostgreSQL connection pool
 *
 * IMPORTANT: This should ONLY be used in server-side code (Server Actions, API Routes, Server Components)
 * NEVER import or use this in client components
 */
export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return pool;
}

/**
 * Execute a query with automatic connection management
 *
 * @example
 * const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const db = getDb();
  return db.query<T>(text, params);
}

/**
 * Close the database pool (useful for testing or graceful shutdown)
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
