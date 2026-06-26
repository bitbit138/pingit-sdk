import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Role } from '@pingit/contracts';
import type { Config } from '../config/env.js';
import type { JwtUser } from '../types.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
    requireRole: (role: Role) => preHandlerHookHandler;
  }
}

/** Register @fastify/jwt and expose `authenticate` + `requireRole` preHandlers. */
export default fp(async function authPlugin(fastify, opts: { config: Config }) {
  await fastify.register(fastifyJwt, {
    secret: opts.config.JWT_SECRET,
  });

  fastify.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized', message: 'Invalid or missing token' });
    }
  });

  fastify.decorate('requireRole', function (role: Role): preHandlerHookHandler {
    return async function (req: FastifyRequest, reply: FastifyReply) {
      if (req.user?.role !== role) {
        return reply.code(403).send({ error: 'forbidden', message: 'Insufficient role' });
      }
    };
  });
});
