import type { Role } from '@pingit/contracts';
import type { Pool } from '../pool.js';
import type { UserRow } from '../../types.js';

export async function findByEmail(pool: Pool, email: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(
    'SELECT id, email, password_hash, role, app_id, created_at FROM users WHERE email = $1',
    [email],
  );
  return res.rows[0] ?? null;
}

export async function createUser(
  pool: Pool,
  input: { email: string; passwordHash: string; role: Role; appId?: string | null },
): Promise<UserRow> {
  const res = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, role, app_id, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id, email, password_hash, role, app_id, created_at`,
    [input.email, input.passwordHash, input.role, input.appId ?? null],
  );
  return res.rows[0]!;
}
