import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { IncomingMessage } from 'node:http';

/**
 * Register a streaming content-type parser for `application/octet-stream` and
 * the wildcard `*`. It consumes the request stream, counts the bytes, and
 * discards them so the upload endpoint never buffers the full payload in memory.
 * Returns `{ bytesReceived, uploadStart }` as the parsed body. A fully-custom
 * stream parser bypasses Fastify's automatic `bodyLimit` enforcement, so we
 * enforce `UPLOAD_MAX_BYTES` here: once exceeded we destroy the stream and raise
 * FST_ERR_CTP_BODY_TOO_LARGE (mapped to 413 by the error handler).
 */
export function registerOctetStreamParser(fastify: FastifyInstance): void {
  const handler = (
    _req: FastifyRequest,
    payload: IncomingMessage,
    done: (err: Error | null, body?: unknown) => void,
  ) => {
    const max = fastify.config.UPLOAD_MAX_BYTES;
    const uploadStart = Date.now();
    let bytesReceived = 0;
    let settled = false;
    payload.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (!settled && bytesReceived > max) {
        settled = true;
        const err = Object.assign(new Error('Request body is too large'), {
          statusCode: 413,
          code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        });
        // Keep draining (don't destroy the socket) so the client finishes its
        // write and actually receives the 413 instead of a connection reset.
        payload.resume();
        done(err);
      }
    });
    payload.on('end', () => {
      if (!settled) {
        settled = true;
        done(null, { bytesReceived, uploadStart });
      }
    });
    payload.on('error', (err: Error) => {
      if (!settled) {
        settled = true;
        done(err);
      }
    });
  };

  fastify.addContentTypeParser('application/octet-stream', handler);
  fastify.addContentTypeParser('*', handler);
}
