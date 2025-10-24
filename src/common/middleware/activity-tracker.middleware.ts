import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ActivityTrackerMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Vérifier si la requête contient un token d'authentification
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Décoder le token JWT pour obtenir l'ID utilisateur
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        
        if (decoded && decoded.sub) {
          // Mettre à jour lastActivity pour toutes les sessions actives de cet utilisateur
          await this.prisma.session.updateMany({
            where: {
              userId: decoded.sub,
              expiresAt: {
                gt: new Date(), // Seulement les sessions non expirées
              },
            },
            data: {
              lastActivity: new Date(),
            },
          });
        }
      } catch (error) {
        // Ignorer les erreurs de décodage JWT (token invalide, etc.)
        // Le middleware d'authentification s'en chargera
      }
    }
    
    next();
  }
}
