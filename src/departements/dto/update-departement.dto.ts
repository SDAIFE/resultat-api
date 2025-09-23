import { IsString, IsOptional } from 'class-validator';

export class UpdateDepartementDto {
  @IsOptional()
  @IsString({ message: 'Le statut de publication doit être une chaîne' })
  statutPublication?: string;
}
