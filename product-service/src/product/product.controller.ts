import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductDto } from './dto/get-product.dto';

interface ProductResponse {
  id: string;
  name: string;
  price: number;
}

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @GrpcMethod('ProductService', 'GetProduct')
  async getProduct(data: GetProductDto): Promise<ProductResponse> {
    const product = await this.productService.findOne(data.id);
    return { id: product.id, name: product.name, price: product.price };
  }

  @GrpcMethod('ProductService', 'CreateProduct')
  async createProduct(data: CreateProductDto): Promise<ProductResponse> {
    const product = await this.productService.create(data.name, data.price);
    return { id: product.id, name: product.name, price: product.price };
  }
}
