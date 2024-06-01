import * as morgan from 'morgan';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 8085;

  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: 422,
      whitelist: true,
    }),
  );

  app.enableCors();
  app.use(helmet());
  app.use(morgan('dev'));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port).finally(() => {
    console.log(`Server started on http://localhost:${port}`);
  });
}
bootstrap();
