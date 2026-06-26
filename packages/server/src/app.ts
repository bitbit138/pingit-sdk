import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import type { Config } from './config/env.js';

import './plugins/config.plugin.js';
import errorHandlerPlugin from './plugins/errorHandler.plugin.js';
import dbPlugin from './plugins/db.plugin.js';
import authPlugin from './plugins/auth.plugin.js';
import rateLimitPlugin from './plugins/rateLimit.plugin.js';
import { registerOctetStreamParser } from './plugins/octetStreamParser.js';

import downloadRoute from './routes/measurement/download.route.js';
import uploadRoute from './routes/measurement/upload.route.js';
import pingRoute from './routes/measurement/ping.route.js';
import profilesRoute from './routes/data/profiles.route.js';
import resultsRoute from './routes/data/results.route.js';
import crashesRoute from './routes/data/crashes.route.js';
import healthRoute from './routes/data/health.route.js';
import loginRoute from './routes/admin/login.route.js';
import adminProfilesRoute from './routes/admin/profiles.admin.route.js';
import adminAppsRoute from './routes/admin/apps.admin.route.js';
import adminAnalyticsRoute from './routes/admin/analytics.admin.route.js';
import adminCrashesRoute from './routes/admin/crashes.admin.route.js';

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const isTest = config.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: isTest
      ? false
      : {
          level: config.LOG_LEVEL,
          transport:
            config.NODE_ENV === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
        },
    bodyLimit: config.UPLOAD_MAX_BYTES,
  });

  // Make caps + config available to every route.
  fastify.decorate('config', config);

  await fastify.register(sensible);
  await fastify.register(errorHandlerPlugin);
  await fastify.register(dbPlugin, { config });
  await fastify.register(authPlugin, { config });
  await fastify.register(cors, { origin: true });
  await fastify.register(rateLimitPlugin, { config });

  // Stream-and-count parser for upload payloads (octet-stream + wildcard).
  registerOctetStreamParser(fastify);

  // Public SDK endpoints.
  await fastify.register(healthRoute);
  await fastify.register(profilesRoute);
  await fastify.register(downloadRoute);
  await fastify.register(uploadRoute);
  await fastify.register(pingRoute);
  await fastify.register(resultsRoute);
  await fastify.register(crashesRoute);

  // Admin API (JWT).
  await fastify.register(loginRoute);
  await fastify.register(adminProfilesRoute);
  await fastify.register(adminAppsRoute);
  await fastify.register(adminAnalyticsRoute);
  await fastify.register(adminCrashesRoute);

  return fastify;
}
