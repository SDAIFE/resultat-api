import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer tous les rôles
   */
  async findAll() {
    return this.prisma.role.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Récupérer la liste simple des rôles (pour les formulaires)
   */
  async getSimpleList() {
    const roles = await this.prisma.role.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return roles.map(role => ({
      id: role.id,
      code: role.code,
      name: role.name,
    }));
  }
}
