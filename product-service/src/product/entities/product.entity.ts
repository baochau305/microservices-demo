import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NumericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('numeric', {
    precision: 12,
    scale: 2,
    transformer: new NumericTransformer(),
  })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
