import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;
}
