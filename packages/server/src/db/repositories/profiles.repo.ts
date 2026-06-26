import type { Requires } from '@pingit/contracts';
import type { Pool, PoolClient } from '../pool.js';
import type { ProfileRow } from '../../types.js';

/** Public GET /profiles shape — global version + the profile list. */
export interface ListProfilesResult {
  version: number;
  profiles: Array<{ id: string; requires: Requires }>;
}

/** Full admin row (id, requires, version, updatedAt). */
export interface AdminProfileRow {
  id: string;
  requires: Requires;
  version: number;
  updatedAt: string;
}

const NEXT_VERSION = '(SELECT COALESCE(MAX(version), 0) + 1 FROM profiles)';

export async function listProfiles(pool: Pool): Promise<ListProfilesResult> {
  const res = await pool.query<ProfileRow>(
    'SELECT id, requires, version FROM profiles ORDER BY id',
  );
  const versionRes = await pool.query<{ version: number }>(
    'SELECT COALESCE(MAX(version), 0)::int AS version FROM profiles',
  );
  return {
    version: versionRes.rows[0]?.version ?? 0,
    profiles: res.rows.map((r) => ({ id: r.id, requires: r.requires as Requires })),
  };
}

export async function listAdmin(pool: Pool): Promise<AdminProfileRow[]> {
  const res = await pool.query<ProfileRow>(
    'SELECT id, requires, version, updated_at FROM profiles ORDER BY id',
  );
  return res.rows.map(toAdminRow);
}

export async function getProfile(pool: Pool, id: string): Promise<AdminProfileRow | null> {
  const res = await pool.query<ProfileRow>(
    'SELECT id, requires, version, updated_at FROM profiles WHERE id = $1',
    [id],
  );
  const row = res.rows[0];
  return row ? toAdminRow(row) : null;
}

export async function createProfile(
  pool: Pool,
  id: string,
  requires: Requires,
): Promise<{ version: number }> {
  return withTransaction(pool, async (client) => {
    const res = await client.query<{ version: number }>(
      `INSERT INTO profiles (id, requires, version, updated_at)
       VALUES ($1, $2::jsonb, ${NEXT_VERSION}, now())
       RETURNING version`,
      [id, JSON.stringify(requires)],
    );
    return { version: res.rows[0]!.version };
  });
}

export async function updateProfile(
  pool: Pool,
  id: string,
  requires: Requires,
): Promise<{ version: number } | null> {
  return withTransaction(pool, async (client) => {
    const res = await client.query<{ version: number }>(
      `UPDATE profiles
       SET requires = $2::jsonb, version = ${NEXT_VERSION}, updated_at = now()
       WHERE id = $1
       RETURNING version`,
      [id, JSON.stringify(requires)],
    );
    const row = res.rows[0];
    return row ? { version: row.version } : null;
  });
}

export async function deleteProfile(pool: Pool, id: string): Promise<{ version: number } | null> {
  return withTransaction(pool, async (client) => {
    const del = await client.query<{ id: string }>(
      'DELETE FROM profiles WHERE id = $1 RETURNING id',
      [id],
    );
    if (del.rowCount === 0) return null;
    // Bump the global version by touching the remaining max, so clients refetch.
    const next = await client.query<{ version: number }>(
      'SELECT COALESCE(MAX(version), 0) + 1 AS version FROM profiles',
    );
    return { version: next.rows[0]!.version };
  });
}

function toAdminRow(r: ProfileRow): AdminProfileRow {
  return {
    id: r.id,
    requires: r.requires as Requires,
    version: r.version,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
