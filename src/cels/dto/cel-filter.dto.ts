import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CelFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  typeCellule?: string;

  @IsOptional()
  @IsString()
  etatResultatCellule?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasUser?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  minBureauxVote?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  maxBureauxVote?: number;

  @IsOptional()
  @IsString()
  departementCode?: string;

  @IsOptional()
  @IsString()
  regionCode?: string;
}
