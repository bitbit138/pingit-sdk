import type { FastifyInstance } from 'fastify';
import { appIdPreHandler } from '../../plugins/appIdAuth.js';

/** Body shape produced by the octet-stream streaming content-type parser. */
interface UploadBody {
  bytesReceived: number;
  uploadStart: number;
}

/**
 * POST /upload — the app-level octet-stream / `*` content-type parser streams
 * the request body, counts the bytes, and discards them (never buffering the
 * payload); Fastify enforces `bodyLimit` and surfaces a 413 via the error
 * handler when exceeded. We just report the tally + elapsed wall time.
 */
export default async function uploadRoute(fastify: FastifyInstance) {
  const max = fastify.config.UPLOAD_MAX_BYTES;

  fastify.post<{ Body: UploadBody }>(
    '/upload',
    {
      bodyLimit: max,
      preHandler: [appIdPreHandler(fastify)],
    },
    async (req, reply) => {
      const start = req.body?.uploadStart ?? Date.now();
      const bytesReceived = req.body?.bytesReceived ?? 0;
      return reply.send({ bytesReceived, elapsedMs: Date.now() - start });
    },
  );
}
