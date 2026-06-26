import supertest from 'supertest';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

export type TestRequest = ReturnType<typeof supertest>;

export interface TestHarness {
  app: FastifyInstance;
  request: TestRequest;
}

/** Build the Fastify app against the test DB, ready to receive requests. */
export async function makeTestApp(): Promise<TestHarness> {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.ready();
  return { app, request: supertest(app.server) };
}
