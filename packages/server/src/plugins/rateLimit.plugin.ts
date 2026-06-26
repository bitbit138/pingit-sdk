import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyRequest } from 'fastify';
import type { Config } from '../config/env.js';

/** Per-app (or per-IP) rate limiting keyed off the x-app-id header. */
export default fp(async function rateLimitPlugin(fastify, opts: { config: Config }) {
  await fastify.register(rateLimit, {
    max: opts.config.RATE_LIMIT_MAX,
    timeWindow: opts.config.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req: FastifyRequest) => (req.headers['x-app-id'] as string) ?? req.ip,
  });
});
