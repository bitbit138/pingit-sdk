import type { FastifyInstance } from 'fastify';
import { appIdPreHandler } from '../../plugins/appIdAuth.js';

export default async function pingRoute(fastify: FastifyInstance) {
  fastify.get('/ping', { preHandler: [appIdPreHandler(fastify)] }, async () => {
    return { t: Date.now() };
  });
}
