import { IsString } from 'class-validator';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      code: string;
    };
    departements: {
      codeDepartement: string;
    }[];
    isActive: boolean;
  };
}

export class RefreshTokenDto {
  @IsString({ message: 'Le refresh token est requis' })
  refreshToken: string;
}
