import type { FastifyInstance } from 'fastify';
import { resultSubmissionSchema } from '@pingit/contracts';
import { appIdPreHandler } from '../../plugins/appIdAuth.js';
import { insertResult, listResults } from '../../db/repositories/results.repo.js';

export default async function resultsRoute(fastify: FastifyInstance) {
  const guard = appIdPreHandler(fastify);

  fastify.post('/results', { preHandler: [guard] }, async (req, reply) => {
    const body = resultSubmissionSchema.parse(req.body);
    if (body.appId !== req.appId) {
      return reply.code(403).send({ error: 'app_id_mismatch', message: 'appId does not match x-app-id' });
    }
    const { id, createdAt } = await insertResult(fastify.db, body);
    return reply.code(201).send({ id, createdAt });
  });

  fastify.get<{ Querystring: { appId?: string; deviceId?: string; limit?: string } }>(
    '/results',
    { preHandler: [guard] },
    async (req, reply) => {
      const { appId, deviceId } = req.query;
      if (!appId || appId !== req.appId) {
        return reply.code(403).send({ error: 'app_id_mismatch', message: 'appId does not match x-app-id' });
      }
      let limit = Number.parseInt(String(req.query.limit ?? ''), 10);
      if (!Number.isInteger(limit)) limit = 20;
      limit = Math.min(100, Math.max(1, limit));
      return listResults(fastify.db, { appId, deviceId, limit });
    },
  );
}
