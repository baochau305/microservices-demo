import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const protoDir = process.env.PROTO_DIR || join(__dirname, '../../proto');
  const url = process.env.GRPC_URL || '0.0.0.0:50052';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'product',
        protoPath: join(protoDir, 'product.proto'),
        url,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableShutdownHooks();

  await app.listen();
  Logger.log(`Product Service (NestJS) gRPC listening on ${url}`, 'Bootstrap');
}

bootstrap();
