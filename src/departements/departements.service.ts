import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DepartementResponseDto, DepartementListResponseDto, DepartementStatsDto } from './dto/departement-response.dto';
import { AssignUserDto, UnassignUserDto } from './dto/assign-user.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';

@Injectable()
export class DepartementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer tous les départements avec pagination
   */
  async findAll(
    page: number = 1, 
    limit: number = 10, 
    search?: string,
    regionCode?: string,
    hasUser?: boolean
  ): Promise<DepartementListResponseDto> {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { libelleDepartement: { contains: search } },
        { codeDepartement: { contains: search } },
      ];
    }
    
    if (regionCode) {
      where.codeRegion = regionCode;
    }
    
    if (hasUser !== undefined) {
      if (hasUser) {
        where.numeroUtilisateur = { not: null };
      } else {
        where.numeroUtilisateur = null;
      }
    }

    const [departements, total] = await Promise.all([
      this.prisma.tblDept.findMany({
        where,
        skip,
        take: limit,
        include: {
          region: true,
          utilisateur: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          sousPrefectures: {
            select: {
              id: true,
              codeSousPrefecture: true,
              libelleSousPrefecture: true,
            },
          },
          communes: {
            select: {
              id: true,
              codeCommune: true,
              libelleCommune: true,
            },
          },
          lieuxVote: {
            select: {
              id: true,
              codeLieuVote: true,
              libelleLieuVote: true,
            },
          },
          bureauxVote: {
            select: {
              id: true,
              numeroBureauVote: true,
              inscrits: true,
              totalVotants: true,
            },
          },
        },
        orderBy: { libelleDepartement: 'asc' },
      }),
      this.prisma.tblDept.count({ where }),
    ]);

    return {
      departements: departements.map(dept => this.formatDepartementResponse(dept)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un département par code
   */
  async findOne(codeDepartement: string): Promise<DepartementResponseDto> {
    const departement = await this.prisma.tblDept.findUnique({
      where: { codeDepartement },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sousPrefectures: {
          select: {
            id: true,
            codeSousPrefecture: true,
            libelleSousPrefecture: true,
          },
        },
        communes: {
          select: {
            id: true,
            codeCommune: true,
            libelleCommune: true,
          },
        },
        lieuxVote: {
          select: {
            id: true,
            codeLieuVote: true,
            libelleLieuVote: true,
          },
        },
        bureauxVote: {
          select: {
            id: true,
            numeroBureauVote: true,
            inscrits: true,
            totalVotants: true,
          },
        },
      },
    });

    if (!departement) {
      throw new NotFoundException('Département non trouvé');
    }

    return this.formatDepartementResponse(departement);
  }

  /**
   * Mettre à jour un département
   */
  async update(codeDepartement: string, updateDepartementDto: UpdateDepartementDto): Promise<DepartementResponseDto> {
    const departement = await this.prisma.tblDept.findUnique({
      where: { codeDepartement },
    });

    if (!departement) {
      throw new NotFoundException('Département non trouvé');
    }

    const updatedDepartement = await this.prisma.tblDept.update({
      where: { codeDepartement },
      data: updateDepartementDto,
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sousPrefectures: {
          select: {
            id: true,
            codeSousPrefecture: true,
            libelleSousPrefecture: true,
          },
        },
        communes: {
          select: {
            id: true,
            codeCommune: true,
            libelleCommune: true,
          },
        },
        lieuxVote: {
          select: {
            id: true,
            codeLieuVote: true,
            libelleLieuVote: true,
          },
        },
        bureauxVote: {
          select: {
            id: true,
            numeroBureauVote: true,
            inscrits: true,
            totalVotants: true,
          },
        },
      },
    });

    return this.formatDepartementResponse(updatedDepartement);
  }

  /**
   * Assigner un utilisateur à un département
   */
  async assignUser(codeDepartement: string, assignUserDto: AssignUserDto): Promise<DepartementResponseDto> {
    const { userId } = assignUserDto;

    // Vérifier si le département existe
    const departement = await this.prisma.tblDept.findUnique({
      where: { codeDepartement },
    });

    if (!departement) {
      throw new NotFoundException('Département non trouvé');
    }

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si le département a déjà un utilisateur assigné
    if (departement.numeroUtilisateur) {
      throw new ConflictException('Ce département a déjà un utilisateur assigné');
    }

    // Assigner l'utilisateur
    const updatedDepartement = await this.prisma.tblDept.update({
      where: { codeDepartement },
      data: { numeroUtilisateur: userId },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sousPrefectures: {
          select: {
            id: true,
            codeSousPrefecture: true,
            libelleSousPrefecture: true,
          },
        },
        communes: {
          select: {
            id: true,
            codeCommune: true,
            libelleCommune: true,
          },
        },
        lieuxVote: {
          select: {
            id: true,
            codeLieuVote: true,
            libelleLieuVote: true,
          },
        },
        bureauxVote: {
          select: {
            id: true,
            numeroBureauVote: true,
            inscrits: true,
            totalVotants: true,
          },
        },
      },
    });

    return this.formatDepartementResponse(updatedDepartement);
  }

  /**
   * Retirer l'utilisateur d'un département
   */
  async unassignUser(codeDepartement: string, unassignUserDto?: UnassignUserDto): Promise<DepartementResponseDto> {
    const departement = await this.prisma.tblDept.findUnique({
      where: { codeDepartement },
    });

    if (!departement) {
      throw new NotFoundException('Département non trouvé');
    }

    if (!departement.numeroUtilisateur) {
      throw new BadRequestException('Ce département n\'a pas d\'utilisateur assigné');
    }

    // Retirer l'utilisateur
    const updatedDepartement = await this.prisma.tblDept.update({
      where: { codeDepartement },
      data: { numeroUtilisateur: null },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sousPrefectures: {
          select: {
            id: true,
            codeSousPrefecture: true,
            libelleSousPrefecture: true,
          },
        },
        communes: {
          select: {
            id: true,
            codeCommune: true,
            libelleCommune: true,
          },
        },
        lieuxVote: {
          select: {
            id: true,
            codeLieuVote: true,
            libelleLieuVote: true,
          },
        },
        bureauxVote: {
          select: {
            id: true,
            numeroBureauVote: true,
            inscrits: true,
            totalVotants: true,
          },
        },
      },
    });

    return this.formatDepartementResponse(updatedDepartement);
  }

  /**
   * Obtenir les statistiques des départements
   */
  async getStats(): Promise<DepartementStatsDto> {
    const [
      totalDepartements,
      departementsAvecUtilisateur,
      departementsSansUtilisateur,
      totalSousPrefectures,
      totalCommunes,
      totalLieuxVote,
      totalBureauxVote,
    ] = await Promise.all([
      this.prisma.tblDept.count(),
      this.prisma.tblDept.count({ where: { numeroUtilisateur: { not: null } } }),
      this.prisma.tblDept.count({ where: { numeroUtilisateur: null } }),
      this.prisma.tblSp.count(),
      this.prisma.tblCom.count(),
      this.prisma.tblLv.count(),
      this.prisma.tblBv.count(),
    ]);

    return {
      totalDepartements,
      departementsAvecUtilisateur,
      departementsSansUtilisateur,
      totalSousPrefectures,
      totalCommunes,
      totalLieuxVote,
      totalBureauxVote,
    };
  }

  /**
   * Récupérer les départements d'une région
   */
  async findByRegion(codeRegion: string): Promise<DepartementResponseDto[]> {
    const departements = await this.prisma.tblDept.findMany({
      where: { codeRegion },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sousPrefectures: {
          select: {
            id: true,
            codeSousPrefecture: true,
            libelleSousPrefecture: true,
          },
        },
        communes: {
          select: {
            id: true,
            codeCommune: true,
            libelleCommune: true,
          },
        },
        lieuxVote: {
          select: {
            id: true,
            codeLieuVote: true,
            libelleLieuVote: true,
          },
        },
        bureauxVote: {
          select: {
            id: true,
            numeroBureauVote: true,
            inscrits: true,
            totalVotants: true,
          },
        },
      },
      orderBy: { libelleDepartement: 'asc' },
    });

    return departements.map(dept => this.formatDepartementResponse(dept));
  }

  /**
   * Formater la réponse département
   */
  private formatDepartementResponse(departement: any): DepartementResponseDto {
    return {
      id: departement.id,
      codeDepartement: departement.codeDepartement,
      codeRegion: departement.codeRegion,
      libelleDepartement: departement.libelleDepartement,
      statutPublication: departement.statutPublication,
      region: {
        id: departement.region.id,
        codeRegion: departement.region.codeRegion,
        libelleRegion: departement.region.libelleRegion,
      },
      utilisateur: departement.utilisateur ? {
        id: departement.utilisateur.id,
        email: departement.utilisateur.email,
        firstName: departement.utilisateur.firstName,
        lastName: departement.utilisateur.lastName,
      } : undefined,
      sousPrefectures: departement.sousPrefectures.map((sp: any) => ({
        id: sp.id,
        codeSousPrefecture: sp.codeSousPrefecture,
        libelleSousPrefecture: sp.libelleSousPrefecture,
      })),
      communes: departement.communes.map((com: any) => ({
        id: com.id,
        codeCommune: com.codeCommune,
        libelleCommune: com.libelleCommune,
      })),
      lieuxVote: departement.lieuxVote.map((lv: any) => ({
        id: lv.id,
        codeLieuVote: lv.codeLieuVote,
        libelleLieuVote: lv.libelleLieuVote,
      })),
      bureauxVote: departement.bureauxVote.map((bv: any) => ({
        id: bv.id,
        numeroBureauVote: bv.numeroBureauVote,
        inscrits: bv.inscrits,
        totalVotants: bv.totalVotants,
      })),
    };
  }

  /**
   * Récupérer la liste simple des départements (pour les formulaires)
   */
  async getSimpleList(): Promise<{ codeDepartement: string; libelleDepartement: string }[]> {
    const departements = await this.prisma.tblDept.findMany({
      select: {
        codeDepartement: true,
        libelleDepartement: true,
      },
      orderBy: {
        libelleDepartement: 'asc',
      },
    });

    return departements.map(dept => ({
      codeDepartement: dept.codeDepartement,
      libelleDepartement: dept.libelleDepartement,
    }));
  }
}
