import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/auth-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Connexion d'un utilisateur
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Rafraîchir le token d'accès
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
    if (!refreshTokenDto?.refreshToken) {
      throw new Error('Refresh token manquant dans le corps de la requête');
    }
    
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Déconnexion
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ message: string }> {
    if (!refreshTokenDto?.refreshToken) {
      throw new Error('Refresh token manquant dans le corps de la requête');
    }
    
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Déconnexion réussie' };
  }

  /**
   * Obtenir le profil de l'utilisateur connecté
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any): Promise<any> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        code: user.role.code,
      },
      departements: user.departements || [],
      isActive: user.isActive,
    };
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyToken(): Promise<{ valid: boolean; message: string }> {
    return {
      valid: true,
      message: 'Token valide',
    };
  }
}
