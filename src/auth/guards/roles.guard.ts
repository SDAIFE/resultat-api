import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    
    // Vérifier si c'est une application publique authentifiée par token API
    if (request.publicApp && request.publicApp.authenticated) {
      console.log('✅ RolesGuard - Application publique authentifiée, accès autorisé');
      return true;
    }
    
    if (!user) {
      console.log('❌ RolesGuard - Utilisateur non authentifié');
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const hasRole = requiredRoles.some((role) => user.role?.code === role);
    
    if (!hasRole) {
      console.log('❌ RolesGuard - Permissions insuffisantes pour le rôle:', user.role?.code);
      throw new ForbiddenException('Permissions insuffisantes');
    }

    console.log('✅ RolesGuard - Utilisateur authentifié avec rôle:', user.role?.code);
    return true;
  }
}
