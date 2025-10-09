import { IsEmail, IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { IsStrongPassword } from '../../auth/decorators/is-strong-password.decorator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString({ message: 'Le prénom est requis' })
  firstName: string;

  @IsString({ message: 'Le nom est requis' })
  lastName: string;

  @IsString({ message: 'Le mot de passe est requis' })
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString({ message: 'Le rôle doit être une chaîne' })
  roleId?: string;

  @IsOptional()
  @IsArray({ message: 'Les départements doivent être un tableau' })
  @IsString({ each: true, message: 'Chaque département doit être une chaîne' })
  departementCodes?: string[];

  @IsOptional()
  @IsArray({ message: 'Les CELs doivent être un tableau' })
  @IsString({ each: true, message: 'Chaque CEL doit être une chaîne' })
  celCodes?: string[];

  @IsOptional()
  @IsBoolean({ message: 'Le statut actif doit être un booléen' })
  isActive?: boolean;
}
