import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { applySecurity, corsOrigins } from './security/security.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  applySecurity(app);

  app.enableCors({
    origin: corsOrigins(),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  console.log(`Backend running: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exitCode = 1;
});
