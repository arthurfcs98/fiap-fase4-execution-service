import './shared/observability/otel';

async function bootstrap() {
  const { NestFactory } = await import('@nestjs/core');
  const { Logger, ValidationPipe } = await import('@nestjs/common');
  const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
  const { AppModule } = await import('./app.module');
  const { CorrelationIdInterceptor } = await import(
    './shared/observability/correlation-id.interceptor'
  );
  const { Logger: PinoLogger } = await import('nestjs-pino');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,X-Correlation-Id',
    exposedHeaders: 'X-Correlation-Id',
  });

  const config = new DocumentBuilder()
    .setTitle('Execution Service — Fase 4')
    .setDescription(
      'Microsserviço de execução de OS. Consome os.saga.execution_started, mantém timeline e checklist em MongoDB, e publica execution.saga.completed quando o mecânico marca a execução como concluída.',
    )
    .setVersion('4.0')
    .addTag('Executions')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Execution Service v4.0 listening on port ${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal during bootstrap:', err);
  process.exit(1);
});
