import type { FastifyInstance } from 'fastify';
import { appIdPreHandler } from '../../plugins/appIdAuth.js';
import { randomByteStream } from '../../services/randomStream.js';

export default async function downloadRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { bytes?: string } }>(
    '/download',
    { preHandler: [appIdPreHandler(fastify)] },
    async (req, reply) => {
      const max = fastify.config.DOWNLOAD_MAX_BYTES;
      const bytes = Number.parseInt(String(req.query.bytes ?? ''), 10);
      if (!Number.isInteger(bytes) || bytes < 1 || bytes > max) {
        return reply.code(400).send({ error: 'bytes_out_of_range', max });
      }
      reply
        .header('Content-Length', String(bytes))
        .header('Content-Type', 'application/octet-stream')
        .header('Cache-Control', 'no-store')
        .header('Content-Encoding', 'identity');
      return reply.send(randomByteStream(bytes));
    },
  );
}
