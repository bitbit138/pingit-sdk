import type { FastifyInstance } from 'fastify';
import { loginRequestSchema } from '@pingit/contracts';
import type { LoginResponse } from '@pingit/contracts';
import { findByEmail } from '../../db/repositories/users.repo.js';
import { compare } from '../../services/password.js';

const ONE_HOUR_SEC = 60 * 60;

export default async function loginRoute(fastify: FastifyInstance) {
  fastify.post('/admin/login', async (req, reply) => {
    const { email, password } = loginRequestSchema.parse(req.body);

    const user = await findByEmail(fastify.db, email);
    const ok = user ? await compare(password, user.password_hash) : false;
    if (!user || !ok) {
      return reply.code(401).send({ error: 'invalid_credentials', message: 'Invalid email or password' });
    }

    const appId = user.app_id ?? null;
    const token = await reply.jwtSign(
      { sub: String(user.id), email: user.email, role: user.role, appId },
      { expiresIn: ONE_HOUR_SEC },
    );

    const expiresAt = new Date(Date.now() + ONE_HOUR_SEC * 1000).toISOString();
    const response: LoginResponse = {
      token,
      role: user.role,
      email: user.email,
      expiresAt,
    };
    if (user.app_id) response.appId = user.app_id;
    return response;
  });
}
