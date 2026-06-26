import type { FastifyInstance } from 'fastify';
import { createProfileSchema, updateProfileSchema } from '@pingit/contracts';
import type { AdminProfile } from '@pingit/contracts';
import {
  listAdmin,
  createProfile,
  updateProfile,
  deleteProfile,
} from '../../db/repositories/profiles.repo.js';

export default async function adminProfilesRoute(fastify: FastifyInstance) {
  const guards = { preHandler: [fastify.authenticate, fastify.requireRole('admin')] };

  fastify.get('/admin/profiles', guards, async () => {
    const rows = await listAdmin(fastify.db);
    return rows as unknown as AdminProfile[];
  });

  fastify.post('/admin/profiles', guards, async (req, reply) => {
    const { id, requires } = createProfileSchema.parse(req.body);
    const { version } = await createProfile(fastify.db, id, requires);
    return reply.code(201).send({ version });
  });

  fastify.put<{ Params: { id: string } }>('/admin/profiles/:id', guards, async (req, reply) => {
    const { requires } = updateProfileSchema.parse(req.body);
    const result = await updateProfile(fastify.db, req.params.id, requires);
    if (!result) {
      return reply.code(404).send({ error: 'not_found', message: 'Profile not found' });
    }
    return { version: result.version };
  });

  fastify.delete<{ Params: { id: string } }>('/admin/profiles/:id', guards, async (req, reply) => {
    const result = await deleteProfile(fastify.db, req.params.id);
    if (!result) {
      return reply.code(404).send({ error: 'not_found', message: 'Profile not found' });
    }
    return { version: result.version };
  });
}
