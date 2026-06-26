import type { FastifyInstance } from 'fastify';
import { computeAnalytics } from '../../services/analytics.service.js';

export default async function adminAnalyticsRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { appId?: string; from?: string; to?: string } }>(
    '/admin/analytics',
    { preHandler: [fastify.authenticate] },
    async (req) => {
      const user = req.user;
      // Developers are locked to their own app; admins may pass appId or omit
      // it for a global view.
      const appId =
        user.role === 'admin' ? req.query.appId ?? null : user.appId ?? null;
      return computeAnalytics(fastify.db, {
        appId,
        from: req.query.from,
        to: req.query.to,
        role: user.role,
      });
    },
  );
}
