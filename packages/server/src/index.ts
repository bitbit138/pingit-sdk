import 'dotenv/config';
import { loadConfig } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { runSeed } from './seed/seed.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const config = loadConfig();

  if (process.env.RUN_MIGRATIONS === 'true') {
    await runMigrations(config);
  }
  if (process.env.RUN_SEED === 'true') {
    await runSeed(config);
  }

  const app = await buildApp(config);
  await app.listen({ port: config.PORT, host: '0.0.0.0' });

  const shutdown = (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    app
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
