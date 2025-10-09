import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/auth-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuditService } from '../common/services/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Connexion d'un utilisateur
   * 🔒 Rate limiting strict : 5 tentatives par minute pour prévenir les attaques par force brute
   * 🔒 Audit : Toutes les tentatives de connexion sont loggées (RGPD)
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentatives par minute
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    try {
      const result = await this.authService.login(loginDto);
      
      // 🔒 AUDIT : Logger la connexion réussie
      await this.auditService.log({
        userId: result.user.id,
        action: 'LOGIN',
        resource: 'auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        details: { email: loginDto.email },
      });
      
      return result;
    } catch (error) {
      // 🔒 AUDIT : Logger la tentative échouée
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        details: { email: loginDto.email, error: error.message },
      });
      
      throw error;
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   * ⚠️ SÉCURITÉ : Endpoint protégé - uniquement accessible aux SADMIN
   * Pour créer des utilisateurs, utiliser l'endpoint /api/users (recommandé)
   */
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SADMIN')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Rafraîchir le token d'accès
   * 🔒 Rate limiting : 10 tentatives par minute
   */
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 tentatives par minute
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
    if (!refreshTokenDto?.refreshToken) {
      throw new Error('Refresh token manquant dans le corps de la requête');
    }
    
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Déconnexion
   * 🔒 Audit : Les déconnexions sont loggées
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @CurrentUser() user: any,
    @Req() req: Request
  ): Promise<{ message: string }> {
    if (!refreshTokenDto?.refreshToken) {
      throw new Error('Refresh token manquant dans le corps de la requête');
    }
    
    await this.authService.logout(refreshTokenDto.refreshToken);
    
    // 🔒 AUDIT : Logger la déconnexion
    await this.auditService.log({
      userId: user.id,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
    
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
      cellules: user.cellules || [],
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
