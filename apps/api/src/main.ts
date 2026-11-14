import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { loadConfig } from './platform/config/env.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
    rawBody: true, // needed for payment webhook signature verification (FR-PAY-3)
  });

  app.setGlobalPrefix(config.API_BASE_PATH);

  // Baseline security headers on every response (SECURITY-04).
  const instance = app.getHttpAdapter().getInstance();
  instance.addHook('onSend', (_req, reply, _payload, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (config.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    done(null, _payload);
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

void bootstrap();
