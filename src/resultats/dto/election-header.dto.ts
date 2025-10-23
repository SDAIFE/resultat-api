import { IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ElectionHeaderDto {
  @IsString()
  id: string;

  @IsString()
  nom: string;

  @IsString()
  date: string;

  @IsString()
  type: string;

  @IsNumber()
  tour: number;

  @IsString()
  status: string;

  @IsString()
  lastUpdate: string;

  @IsNumber()
  inscrits: number;

  @IsNumber()
  inscritsHommes: number;

  @IsNumber()
  inscritsFemmes: number;

  @IsNumber()
  votants: number;

  @IsNumber()
  votantsHommes: number;

  @IsNumber()
  votantsFemmes: number;

  @IsNumber()
  tauxParticipation: number;

  @IsNumber()
  suffrageExprime: number;

  @IsArray()
  @IsString({ each: true })
  departementsPublies: string[];
}

export class ElectionHeaderResponseDto {
  @IsBoolean()
  success: boolean;

  @ValidateNested()
  @Type(() => ElectionHeaderDto)
  data: ElectionHeaderDto;

  @IsString()
  message: string;
}
