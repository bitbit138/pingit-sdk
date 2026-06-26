import type { FastifyInstance } from 'fastify';
import { listCrashes } from '../../db/repositories/crashes.repo.js';

export default async function adminCrashesRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { appId?: string } }>(
    '/admin/crashes',
    { preHandler: [fastify.authenticate] },
    async (req) => {
      const user = req.user;
      // Developers scoped to their app; admins may pass appId or omit for all.
      const appId =
        user.role === 'admin' ? req.query.appId ?? null : user.appId ?? null;
      return listCrashes(fastify.db, { appId, limit: 200 });
    },
  );
}
