import type { FastifyInstance } from 'fastify';
import { crashSubmissionSchema } from '@pingit/contracts';
import { appIdPreHandler } from '../../plugins/appIdAuth.js';
import { insertCrash } from '../../db/repositories/crashes.repo.js';

export default async function crashesRoute(fastify: FastifyInstance) {
  fastify.post('/crashes', { preHandler: [appIdPreHandler(fastify)] }, async (req, reply) => {
    const body = crashSubmissionSchema.parse(req.body);
    const { id } = await insertCrash(fastify.db, body);
    return reply.code(201).send({ id });
  });
}
