import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { SessionService } from '../common/services/session.service';
import { GracePeriodService } from '../common/services/grace-period.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthErrorFactory } from './types/auth-error.types';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheService: CacheService,
    private configService: ConfigService,
    private sessionService: SessionService,
    private gracePeriodService: GracePeriodService,
  ) {}

  /**
   * Authentification d'un utilisateur
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { 
        role: true,
        departements: {
          select: {
            codeDepartement: true
          }
        }
      },
    });

    if (!user || !user.isActive) {
      throw AuthErrorFactory.invalidCredentials();
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw AuthErrorFactory.invalidCredentials();
    }

    // Récupérer les CELs basées sur les départements attribués
    let cellules: any[] = [];
    if (user.departements && user.departements.length > 0) {
      const departementCodes = user.departements.map(d => d.codeDepartement);
      
      cellules = await this.prisma.tblCel.findMany({
        where: {
          lieuxVote: {
            some: {
              codeDepartement: { in: departementCodes },
            },
          },
        },
        select: {
          id: true,
          codeCellule: true,
          libelleCellule: true,
        },
        orderBy: { libelleCellule: 'asc' },
      });
    }

    // Générer les tokens
    const tokens = await this.generateTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: {
          code: user.role.code,
        },
        departements: user.departements || [],
        cellules: cellules || [],
        isActive: user.isActive,
      },
    };
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, firstName, lastName, password, roleId = 'USER' } = registerDto;

    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Vérifier si le rôle existe
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new ConflictException('Rôle invalide');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        roleId,
      },
      include: { 
        role: true,
        departements: {
          select: {
            id:true,
            codeDepartement: true,
            libelleDepartement:true
          }
        }
      },
    });

    // Récupérer les CELs basées sur les départements attribués
    let cellules: any[] = [];
    if (user.departements && user.departements.length > 0) {
      const departementCodes = user.departements.map(d => d.codeDepartement);
      
      cellules = await this.prisma.tblCel.findMany({
        where: {
          lieuxVote: {
            some: {
              codeDepartement: { in: departementCodes },
            },
          },
        },
        select: {
          id: true,
          codeCellule: true,
          libelleCellule: true,
        },
        orderBy: { libelleCellule: 'asc' },
      });
    }

    // Générer les tokens
    const tokens = await this.generateTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: {
          code: user.role.code,
        },
        departements: user.departements || [],
        cellules: cellules,
        isActive: user.isActive,
      },
    };
  }

  /**
   * Rafraîchir le token d'accès avec rotation du refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    // Vérifier si la session est active (sliding sessions)
    const isActive = await this.sessionService.isSessionActive(refreshToken);
    if (!isActive) {
      throw AuthErrorFactory.sessionInactive();
    }

    // Vérifier le cache d'abord
    const cacheKey = `session:${refreshToken}`;
    let session = this.cacheService.get<any>(cacheKey);

    if (!session) {
      // Vérifier le refresh token en base de données
      session = await this.prisma.session.findUnique({
        where: { refreshToken },
        include: { 
          user: { 
            include: { 
              role: true,
              departements: {
                select: {
                  codeDepartement: true
                }
              }
            } 
          } 
        },
      });

      if (!session) {
        throw AuthErrorFactory.refreshTokenInvalid();
      }

      // Mettre en cache pour 5 minutes
      this.cacheService.set(cacheKey, session, 5 * 60 * 1000);
    }

    if (session.expiresAt < new Date()) {
      // Nettoyer le cache si expiré
      this.cacheService.delete(cacheKey);
      throw AuthErrorFactory.refreshTokenExpired();
    }

    // Générer un nouveau token d'accès
    const payload = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role.code,
    };

    const accessToken = this.jwtService.sign(payload);

    // Ajouter l'ancien access token en grace period (si on peut l'extraire de la requête)
    // Note: Dans un contexte réel, on devrait passer l'ancien token depuis le contrôleur
    // Pour l'instant, on se concentre sur la logique de grace period

    // Générer un nouveau refresh token (rotation)
    const newRefreshToken = randomBytes(32).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    
    // Calculer la nouvelle date d'expiration
    const expiresAt = new Date();
    if (refreshExpiresIn.endsWith('d')) {
      const days = parseInt(refreshExpiresIn.replace('d', ''));
      expiresAt.setDate(expiresAt.getDate() + days);
    } else if (refreshExpiresIn.endsWith('h')) {
      const hours = parseInt(refreshExpiresIn.replace('h', ''));
      expiresAt.setHours(expiresAt.getHours() + hours);
    } else {
      // Fallback à 30 jours
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // Supprimer l'ancienne session et créer la nouvelle
    await this.prisma.session.delete({
      where: { refreshToken },
    });

    await this.prisma.session.create({
      data: {
        userId: session.user.id,
        refreshToken: newRefreshToken,
        expiresAt,
        lastActivity: new Date(), // Ajouter le tracking d'activité
      },
    });

    // Nettoyer le cache de l'ancien token
    this.cacheService.delete(cacheKey);

    // Récupérer les CELs basées sur les départements attribués
    let cellules: any[] = [];
    if (session.user.departements && session.user.departements.length > 0) {
      const departementCodes = session.user.departements.map(d => d.codeDepartement);
      
      cellules = await this.prisma.tblCel.findMany({
        where: {
          lieuxVote: {
            some: {
              codeDepartement: { in: departementCodes },
            },
          },
        },
        select: {
          id: true,
          codeCellule: true,
          libelleCellule: true,
        },
        orderBy: { libelleCellule: 'asc' },
      });
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: {
          code: session.user.role.code,
        },
        departements: session.user.departements || [],
        cellules: cellules || [],
        isActive: session.user.isActive,
      },
    };
  }

  /**
   * Déconnexion (invalider le refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    // Supprimer de la base de données
    await this.prisma.session.deleteMany({
      where: { refreshToken },
    });

    // Nettoyer le cache
    const cacheKey = `session:${refreshToken}`;
    this.cacheService.delete(cacheKey);
  }

  /**
   * Générer les tokens d'accès et de rafraîchissement
   */
  private async generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Générer le token d'accès
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
    };

    const accessToken = this.jwtService.sign(payload);

    // Générer le refresh token
    const refreshToken = randomBytes(32).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    
    // Calculer la date d'expiration
    const expiresAt = new Date();
    if (refreshExpiresIn.endsWith('d')) {
      const days = parseInt(refreshExpiresIn.replace('d', ''));
      expiresAt.setDate(expiresAt.getDate() + days);
    } else if (refreshExpiresIn.endsWith('h')) {
      const hours = parseInt(refreshExpiresIn.replace('h', ''));
      expiresAt.setHours(expiresAt.getHours() + hours);
    } else {
      // Fallback à 30 jours
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // Sauvegarder la session avec tracking d'activité
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
        lastActivity: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Valider un token d'accès
   */
  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw AuthErrorFactory.tokenExpired();
      } else {
        throw AuthErrorFactory.tokenInvalid();
      }
    }
  }

  /**
   * Valider un utilisateur (pour la stratégie JWT)
   */
  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        role: true,
        departements: {
          select: {
            codeDepartement: true
          }
        }
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Récupérer les CELs basées sur les départements attribués
    let cellules: any[] = [];
    if (user.departements && user.departements.length > 0) {
      const departementCodes = user.departements.map(d => d.codeDepartement);
      
      cellules = await this.prisma.tblCel.findMany({
        where: {
          lieuxVote: {
            some: {
              codeDepartement: { in: departementCodes },
            },
          },
        },
        select: {
          id: true,
          codeCellule: true,
          libelleCellule: true,
        },
        orderBy: { libelleCellule: 'asc' },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departements: user.departements || [],
      cellules: cellules,
      isActive: user.isActive,
    };
  }
}
