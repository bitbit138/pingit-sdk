import type { FastifyInstance } from 'fastify';
import { appIdPreHandler } from '../../plugins/appIdAuth.js';
import { listProfiles } from '../../db/repositories/profiles.repo.js';

export default async function profilesRoute(fastify: FastifyInstance) {
  fastify.get('/profiles', { preHandler: [appIdPreHandler(fastify)] }, async () => {
    return listProfiles(fastify.db);
  });
}
