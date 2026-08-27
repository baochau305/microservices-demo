import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { ProductModule } from './product/product.module';
import { CorrelationInterceptor } from './common/correlation/correlation.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    ProductModule,
  ],
  providers: [
    // Áp cho mọi gRPC handler: khôi phục correlation ID từ metadata của caller.
    { provide: APP_INTERCEPTOR, useClass: CorrelationInterceptor },
  ],
})
export class AppModule {}
