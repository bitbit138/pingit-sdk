import pg from 'pg';

const { Pool } = pg;
export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;
export type QueryResultRow = pg.QueryResultRow;

export function makePool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  pool: Pool,
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

export async function closePool(pool: Pool): Promise<void> {
  await pool.end();
}
