import fp from 'fastify-plugin';
import type { Config } from '../config/env.js';
import { makePool, closePool } from '../db/pool.js';
import type { Pool } from '../db/pool.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }
}

/** Open a pg Pool from config.DATABASE_URL, decorate it, close it on shutdown. */
export default fp(async function dbPlugin(fastify, opts: { config: Config }) {
  const pool = makePool(opts.config.DATABASE_URL);
  fastify.decorate('db', pool);
  fastify.addHook('onClose', async () => {
    await closePool(pool);
  });
});
