import type { FastifyInstance } from 'fastify';
import { createAppSchema } from '@pingit/contracts';
import { createApp, listApps, revokeApp, getApp } from '../../db/repositories/apps.repo.js';
import { clearAppIdCache } from '../../services/appId.service.js';

export default async function adminAppsRoute(fastify: FastifyInstance) {
  const guards = { preHandler: [fastify.authenticate] };

  fastify.post('/admin/apps', guards, async (req, reply) => {
    const body = createAppSchema.parse(req.body);
    const user = req.user;
    // Developers always own what they create; admins may assign an owner.
    const ownerEmail = user.role === 'admin' ? body.ownerEmail ?? user.email : user.email;
    const created = await createApp(fastify.db, { name: body.name, ownerEmail });
    return reply.code(201).send(created);
  });

  fastify.get('/admin/apps', guards, async (req) => {
    const user = req.user;
    if (user.role === 'admin') return listApps(fastify.db);
    return listApps(fastify.db, { ownerEmail: user.email });
  });

  fastify.delete<{ Params: { appId: string } }>('/admin/apps/:appId', guards, async (req, reply) => {
    const user = req.user;
    const { appId } = req.params;
    const app = await getApp(fastify.db, appId);
    if (!app) {
      return reply.code(404).send({ error: 'not_found', message: 'App not found' });
    }
    if (user.role !== 'admin' && app.ownerEmail !== user.email) {
      return reply.code(403).send({ error: 'forbidden', message: 'Not your app' });
    }
    await revokeApp(fastify.db, appId);
    clearAppIdCache();
    return reply.send({ ok: true });
  });
}
