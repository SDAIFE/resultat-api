import { IsEmail, IsString, IsOptional } from 'class-validator';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class RegisterDto {
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
}
