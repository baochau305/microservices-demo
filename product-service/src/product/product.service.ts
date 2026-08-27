import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findOne(id: string): Promise<Product> {
    let product: Product | null = null;
    try {
      product = await this.productRepository.findOne({ where: { id } });
    } catch {
      // id sai định dạng UUID -> coi như không tìm thấy.
      product = null;
    }

    if (!product) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Product not found: ${id}`,
      });
    }
    return product;
  }

  async create(name: string, price: number): Promise<Product> {
    const product = this.productRepository.create({ name, price });
    return this.productRepository.save(product);
  }
}
