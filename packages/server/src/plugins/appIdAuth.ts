import type { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { validateAppId } from '../services/appId.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    appId?: string;
  }
}

/**
 * Build a preHandler that requires a valid `x-app-id` (header or ?appId query)
 * and attaches it to `req.appId`. Returns 401 `invalid_app_id` otherwise.
 */
export function appIdPreHandler(fastify: FastifyInstance): preHandlerHookHandler {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const headerVal = req.headers['x-app-id'];
    const queryVal = (req.query as { appId?: string } | undefined)?.appId;
    const appId = (Array.isArray(headerVal) ? headerVal[0] : headerVal) ?? queryVal;

    if (!appId || !(await validateAppId(fastify.db, appId))) {
      return reply.code(401).send({ error: 'invalid_app_id' });
    }
    req.appId = appId;
  };
}
