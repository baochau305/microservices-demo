import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ProductService } from "./product.service";

interface GetProductRequest {
  id: string;
}

interface CreateProductRequest {
  name: string;
  price: number;
}

interface ProductResponse {
  id: string;
  name: string;
  price: number;
}

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @GrpcMethod("ProductService", "GetProduct")
  getProduct(data: GetProductRequest): ProductResponse {
    console.log("GetProduct called for ID:", data.id);
    return this.productService.getProduct(data.id);
  }

  @GrpcMethod("ProductService", "CreateProduct")
  createProduct(data: CreateProductRequest): ProductResponse {
    console.log("CreateProduct called:", data.name, data.price);
    return this.productService.createProduct(data.name, data.price);
  }
}
