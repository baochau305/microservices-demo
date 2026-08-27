import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [Product],
        // Demo: tự đồng bộ schema. Production nên dùng migrations thay vì synchronize.
        synchronize: true,
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
