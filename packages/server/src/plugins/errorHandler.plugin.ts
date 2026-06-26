import fp from 'fastify-plugin';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/** Uniform JSON error envelope: { error, message, statusCode }. */
export default fp(async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler((error: FastifyError, _req: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Request validation failed',
        statusCode: 400,
        issues: error.issues,
      });
    }

    const code = (error as { code?: string }).code;
    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.code(413).send({
        error: 'payload_too_large',
        message: 'Request body exceeds the configured limit',
        statusCode: 413,
      });
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      fastify.log.error({ err: error }, 'Unhandled error');
      return reply.code(500).send({
        error: 'internal_error',
        message: 'Internal Server Error',
        statusCode: 500,
      });
    }

    return reply.code(statusCode).send({
      error: error.name || 'error',
      message: error.message,
      statusCode,
    });
  });

  fastify.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({
      error: 'not_found',
      message: 'Route not found',
      statusCode: 404,
    });
  });
});
