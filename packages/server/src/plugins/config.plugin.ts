import type { Config } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export {};
