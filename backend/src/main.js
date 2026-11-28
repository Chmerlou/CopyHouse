const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');
const { ApiExceptionFilter } = require('./common/api-exception.filter');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const specPath = path.join(process.cwd(), 'openapi.yaml');
  const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
