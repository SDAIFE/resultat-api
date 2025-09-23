import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsArray({ message: 'Les départements doivent être un tableau' })
  @IsString({ each: true, message: 'Chaque département doit être une chaîne' })
  departementCodes?: string[];
}
