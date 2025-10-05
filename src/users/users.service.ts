import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, UserListResponseDto } from './dto/user-response.dto';
import { AssignDepartementsDto } from './dto/assign-departements.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un nouvel utilisateur
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, firstName, lastName, password, roleId = 'USER', departementCodes = [], celCodes = [], isActive = true } = createUserDto;

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
      throw new BadRequestException('Rôle invalide');
    }

    // Vérifier si les départements existent
    if (departementCodes.length > 0) {
      const departements = await this.prisma.tblDept.findMany({
        where: { codeDepartement: { in: departementCodes } },
      });

      if (departements.length !== departementCodes.length) {
        const foundCodes = departements.map(d => d.codeDepartement);
        const missingCodes = departementCodes.filter(code => !foundCodes.includes(code));
        throw new BadRequestException(`Départements non trouvés: ${missingCodes.join(', ')}`);
      }
    }

    // Vérifier si les CELs existent
    if (celCodes.length > 0) {
      const cels = await this.prisma.tblCel.findMany({
        where: { codeCellule: { in: celCodes } },
      });

      if (cels.length !== celCodes.length) {
        const foundCodes = cels.map(c => c.codeCellule);
        const missingCodes = celCodes.filter(code => !foundCodes.includes(code));
        throw new BadRequestException(`CELs non trouvées: ${missingCodes.join(', ')}`);
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur avec les départements et CELs
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        roleId,
        isActive,
        departements: {
          connect: departementCodes.map(code => ({ codeDepartement: code })),
        },
        cellules: {
          connect: celCodes.map(code => ({ codeCellule: code })),
        },
      },
      include: {
        role: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
        cellules: {
          select: {
            id: true,
            codeCellule: true,
            libelleCellule: true,
          },
        },
      },
    });

    return this.formatUserResponse(user);
  }

  /**
   * Récupérer tous les utilisateurs avec pagination et statut de connexion
   */
  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<UserListResponseDto> {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: true,
          departements: {
            select: {
              id: true,
              codeDepartement: true,
              libelleDepartement: true,
            },
          },
          cellules: {
            select: {
              id: true,
              codeCellule: true,
              libelleCellule: true,
            },
          },
          sessions: {
            where: {
              expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              createdAt: true,
              expiresAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(user => this.formatUserResponse(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
        cellules: {
          select: {
            id: true,
            codeCellule: true,
            libelleCellule: true,
          },
        },
        sessions: {
          where: {
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.formatUserResponse(user);
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const { departementCodes, celCodes, roleId, ...userData } = updateUserDto;

    // Vérifier si l'utilisateur existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (userData.email) {
      const emailUser = await this.prisma.user.findFirst({
        where: { email: userData.email, id: { not: id } },
      });

      if (emailUser) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
    }

    // Vérifier le rôle si fourni
    if (roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new BadRequestException('Rôle invalide');
      }
    }

    // Vérifier les départements si fournis
    if (departementCodes && departementCodes.length > 0) {
      const departements = await this.prisma.tblDept.findMany({
        where: { codeDepartement: { in: departementCodes } },
      });

      if (departements.length !== departementCodes.length) {
        const foundCodes = departements.map(d => d.codeDepartement);
        const missingCodes = departementCodes.filter(code => !foundCodes.includes(code));
        throw new BadRequestException(`Départements non trouvés: ${missingCodes.join(', ')}`);
      }
    }

    // Vérifier les CELs si fournies
    if (celCodes && celCodes.length > 0) {
      const cels = await this.prisma.tblCel.findMany({
        where: { codeCellule: { in: celCodes } },
      });

      if (cels.length !== celCodes.length) {
        const foundCodes = cels.map(c => c.codeCellule);
        const missingCodes = celCodes.filter(code => !foundCodes.includes(code));
        throw new BadRequestException(`CELs non trouvées: ${missingCodes.join(', ')}`);
      }
    }

    // Hasher le mot de passe si fourni
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...userData };

    // Ajouter le rôle si fourni
    if (roleId) {
      updateData.role = {
        connect: { id: roleId }
      };
    }

    // Ajouter les départements si fournis
    if (departementCodes !== undefined) {
      updateData.departements = {
        set: departementCodes.map(code => ({ codeDepartement: code })),
      };
    }

    // Ajouter les CELs si fournies
    if (celCodes !== undefined) {
      updateData.cellules = {
        set: celCodes.map(code => ({ codeCellule: code })),
      };
    }

    // Mettre à jour l'utilisateur
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
        cellules: {
          select: {
            id: true,
            codeCellule: true,
            libelleCellule: true,
          },
        },
      },
    });

    return this.formatUserResponse(user);
  }

  /**
   * Supprimer un utilisateur
   */
  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Assigner des départements à un utilisateur
   */
  async assignDepartements(id: string, assignDepartementsDto: AssignDepartementsDto): Promise<UserResponseDto> {
    const { departementCodes } = assignDepartementsDto;

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si les départements existent
    const departements = await this.prisma.tblDept.findMany({
      where: { codeDepartement: { in: departementCodes } },
    });

    if (departements.length !== departementCodes.length) {
      const foundCodes = departements.map(d => d.codeDepartement);
      const missingCodes = departementCodes.filter(code => !foundCodes.includes(code));
      throw new BadRequestException(`Départements non trouvés: ${missingCodes.join(', ')}`);
    }

    // Assigner les départements
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        departements: {
          set: departementCodes.map(code => ({ codeDepartement: code })),
        },
      },
      include: {
        role: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
      },
    });

    return this.formatUserResponse(updatedUser);
  }

  /**
   * Retirer tous les départements d'un utilisateur
   */
  async removeAllDepartements(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        departements: {
          set: [],
        },
      },
      include: {
        role: true,
        departements: {
          select: {
            id: true,
            codeDepartement: true,
            libelleDepartement: true,
          },
        },
      },
    });

    return this.formatUserResponse(updatedUser);
  }

  /**
   * Formater la réponse utilisateur
   */
  private formatUserResponse(user: any): UserResponseDto {
    // Déterminer si l'utilisateur est connecté
    const isConnected = user.sessions && user.sessions.length > 0;
    const lastConnectionAt = isConnected ? user.sessions[0].createdAt : null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
      isActive: user.isActive,
      isConnected,
      lastConnectionAt,
      departements: user.departements.map((dept: any) => ({
        id: dept.id,
        codeDepartement: dept.codeDepartement,
        libelleDepartement: dept.libelleDepartement,
      })),
      cellules: user.cellules?.map((cel: any) => ({
        id: cel.id,
        codeCellule: cel.codeCellule,
        libelleCellule: cel.libelleCellule,
      })) || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
