import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

interface Product {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class ProductService {
  private products: Map<string, Product> = new Map();
  private nextId = 1;

  getProduct(id: string): Product {
    const product = this.products.get(id);
    if (!product) {
      throw new RpcException(`Product not found: ${id}`);
    }
    return product;
  }

  createProduct(name: string, price: number): Product {
    const id = String(this.nextId++);
    const product: Product = { id, name, price };
    this.products.set(id, product);
    return product;
  }
}
