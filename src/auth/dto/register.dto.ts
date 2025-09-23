import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString({ message: 'Le prénom est requis' })
  firstName: string;

  @IsString({ message: 'Le nom est requis' })
  lastName: string;

  @IsString({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @IsOptional()
  @IsString({ message: 'Le rôle doit être une chaîne' })
  roleId?: string;
}
