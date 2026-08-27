import { ValueTransformer } from 'typeorm';

/**
 * Postgres trả về kiểu numeric dưới dạng string. Transformer này đảm bảo
 * entity luôn expose `price` là number.
 */
export class NumericTransformer implements ValueTransformer {
  to(value: number): number {
    return value;
  }

  from(value: string | null): number | null {
    return value === null ? null : parseFloat(value);
  }
}
