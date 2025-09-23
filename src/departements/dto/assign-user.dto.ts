import { IsString, IsOptional } from 'class-validator';

export class AssignUserDto {
  @IsString({ message: 'L\'ID de l\'utilisateur est requis' })
  userId: string;
}

export class UnassignUserDto {
  @IsOptional()
  @IsString({ message: 'L\'ID de l\'utilisateur doit être une chaîne' })
  userId?: string;
}
