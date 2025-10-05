import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CelResponseDto, CelListResponseDto, CelStatsDto, CelUpdateDto, CelAssignUserDto } from './dto/cel-response.dto';
import { CelFilterDto } from './dto/cel-filter.dto';

@Injectable()
export class CelsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer toutes les CELs avec pagination et filtres
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters: CelFilterDto = {}
  ): Promise<CelListResponseDto> {
    const skip = (page - 1) * limit;
    
    const where = this.buildWhereClause(filters);

    const [cels, total] = await Promise.all([
      this.prisma.tblCel.findMany({
        where,
        skip,
        take: limit,
        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          lieuxVote: {
            include: {
              commune: {
                select: {
                  codeCommune: true,
                  libelleCommune: true,
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
          },
        },
        orderBy: { libelleCellule: 'asc' },
      }),
      this.prisma.tblCel.count({ where }),
    ]);

    const formattedCels = cels.map(cel => this.formatCelResponse(cel));

    return {
      cels: formattedCels,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer une CEL par code
   */
  async findOne(codeCellule: string): Promise<CelResponseDto> {
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        lieuxVote: {
          include: {
            commune: {
              select: {
                codeCommune: true,
                libelleCommune: true,
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
        },
      },
    });

    if (!cel) {
      throw new NotFoundException('CEL non trouvée');
    }

    return this.formatCelResponse(cel);
  }

  /**
   * Mettre à jour une CEL
   */
  async update(codeCellule: string, updateDto: CelUpdateDto): Promise<CelResponseDto> {
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
    });

    if (!cel) {
      throw new NotFoundException('CEL non trouvée');
    }

    const updatedCel = await this.prisma.tblCel.update({
      where: { codeCellule },
      data: updateDto,
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        lieuxVote: {
          include: {
            commune: {
              select: {
                codeCommune: true,
                libelleCommune: true,
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
        },
      },
    });

    return this.formatCelResponse(updatedCel);
  }

  /**
   * Assigner un utilisateur à une CEL
   */
  async assignUser(codeCellule: string, assignUserDto: CelAssignUserDto): Promise<CelResponseDto> {
    const { userId } = assignUserDto;

    // Vérifier si la CEL existe
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
    });

    if (!cel) {
      throw new NotFoundException('CEL non trouvée');
    }

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si la CEL a déjà un utilisateur assigné
    if (cel.numeroUtilisateur) {
      throw new ConflictException('Cette CEL a déjà un utilisateur assigné');
    }

    // Assigner l'utilisateur
    const updatedCel = await this.prisma.tblCel.update({
      where: { codeCellule },
      data: { numeroUtilisateur: userId },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        lieuxVote: {
          include: {
            commune: {
              select: {
                codeCommune: true,
                libelleCommune: true,
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
        },
      },
    });

    return this.formatCelResponse(updatedCel);
  }

  /**
   * Retirer l'utilisateur d'une CEL
   */
  async unassignUser(codeCellule: string): Promise<CelResponseDto> {
    const cel = await this.prisma.tblCel.findUnique({
      where: { codeCellule },
    });

    if (!cel) {
      throw new NotFoundException('CEL non trouvée');
    }

    if (!cel.numeroUtilisateur) {
      throw new BadRequestException('Cette CEL n\'a pas d\'utilisateur assigné');
    }

    // Retirer l'utilisateur
    const updatedCel = await this.prisma.tblCel.update({
      where: { codeCellule },
      data: { numeroUtilisateur: null },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        lieuxVote: {
          include: {
            commune: {
              select: {
                codeCommune: true,
                libelleCommune: true,
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
        },
      },
    });

    return this.formatCelResponse(updatedCel);
  }

  /**
   * Obtenir les statistiques des CELs
   */
  async getStats(): Promise<CelStatsDto> {
    const [
      totalCels,
      celsAvecUtilisateur,
      celsSansUtilisateur,
      celsParType,
      totalLieuxVote,
      totalBureauxVote,
      totalInscrits,
      totalVotants,
    ] = await Promise.all([
      this.prisma.tblCel.count(),
      this.prisma.tblCel.count({ where: { numeroUtilisateur: { not: null } } }),
      this.prisma.tblCel.count({ where: { numeroUtilisateur: null } }),
      this.prisma.tblCel.groupBy({
        by: ['typeCellule'],
        _count: { typeCellule: true },
      }),
      this.prisma.tblLv.count(),
      this.prisma.tblBv.count(),
      this.prisma.tblBv.aggregate({
        _sum: { inscrits: true },
      }),
      this.prisma.tblBv.aggregate({
        _sum: { totalVotants: true },
      }),
    ]);

    const tauxParticipationGlobal = totalInscrits._sum.inscrits 
      ? (totalVotants._sum.totalVotants || 0) / totalInscrits._sum.inscrits * 100 
      : 0;

    return {
      totalCels,
      celsAvecUtilisateur,
      celsSansUtilisateur,
      celsParType: celsParType.reduce((acc, item) => {
        acc[item.typeCellule || 'Non défini'] = item._count.typeCellule;
        return acc;
      }, {} as Record<string, number>),
      totalLieuxVote,
      totalBureauxVote,
      totalInscrits: totalInscrits._sum.inscrits || 0,
      totalVotants: totalVotants._sum.totalVotants || 0,
      tauxParticipationGlobal,
    };
  }

  /**
   * Récupérer les CELs d'un département
   */
  async findByDepartement(codeDepartement: string): Promise<CelResponseDto[]> {
    // Récupérer les lieux de vote du département
    const lieuxVote = await this.prisma.tblLv.findMany({
      where: {
        departement: { codeDepartement },
        codeCellule: { not: null },
      },
      select: { codeCellule: true },
    });

    const codesCellule = [...new Set(lieuxVote.map(lv => lv.codeCellule).filter((code): code is string => Boolean(code)))];

    if (codesCellule.length === 0) {
      return [];
    }

    const cels = await this.prisma.tblCel.findMany({
      where: { codeCellule: { in: codesCellule } },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        lieuxVote: {
          include: {
            commune: {
              select: {
                codeCommune: true,
                libelleCommune: true,
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
        },
      },
      orderBy: { libelleCellule: 'asc' },
    });

    return cels.map(cel => this.formatCelResponse(cel));
  }

  /**
   * Construire la clause WHERE pour les filtres
   */
  private buildWhereClause(filters: CelFilterDto): any {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { libelleCellule: { contains: filters.search } },
        { codeCellule: { contains: filters.search } },
      ];
    }

    if (filters.typeCellule) {
      where.typeCellule = filters.typeCellule;
    }

    if (filters.etatResultatCellule) {
      where.etatResultatCellule = filters.etatResultatCellule;
    }

    if (filters.hasUser !== undefined) {
      if (filters.hasUser) {
        where.numeroUtilisateur = { not: null };
      } else {
        where.numeroUtilisateur = null;
      }
    }

    if (filters.minBureauxVote !== undefined) {
      where.nombreBureauxVote = { gte: filters.minBureauxVote };
    }

    if (filters.maxBureauxVote !== undefined) {
      where.nombreBureauxVote = { 
        ...where.nombreBureauxVote,
        lte: filters.maxBureauxVote 
      };
    }

    // Filtres géographiques
    if (filters.departementCode || filters.regionCode) {
      where.lieuxVote = {
        some: {
          ...(filters.departementCode && {
            departement: { codeDepartement: filters.departementCode }
          }),
          ...(filters.regionCode && {
            departement: { codeRegion: filters.regionCode }
          }),
        },
      };
    }

    return where;
  }

  /**
   * Formater la réponse CEL
   */
  private formatCelResponse(cel: any): CelResponseDto {
    // Calculer les statistiques
    const totalLieuxVote = cel.lieuxVote.length;
    const totalBureauxVote = cel.lieuxVote.reduce((sum: number, lv: any) => sum + lv.bureauxVote.length, 0);
    const totalInscrits = cel.lieuxVote.reduce((sum: number, lv: any) => 
      sum + lv.bureauxVote.reduce((bvSum: number, bv: any) => bvSum + (bv.inscrits || 0), 0), 0
    );
    const totalVotants = cel.lieuxVote.reduce((sum: number, lv: any) => 
      sum + lv.bureauxVote.reduce((bvSum: number, bv: any) => bvSum + (bv.totalVotants || 0), 0), 0
    );
    const tauxParticipation = totalInscrits > 0 ? (totalVotants / totalInscrits) * 100 : 0;

    return {
      id: cel.id,
      codeCellule: cel.codeCellule,
      typeCellule: cel.typeCellule,
      ligneDebutCellule: cel.ligneDebutCellule,
      etatResultatCellule: cel.etatResultatCellule,
      nombreBureauxVote: cel.nombreBureauxVote,
      libelleCellule: cel.libelleCellule,
      utilisateur: cel.utilisateur ? {
        id: cel.utilisateur.id,
        email: cel.utilisateur.email,
        firstName: cel.utilisateur.firstName,
        lastName: cel.utilisateur.lastName,
      } : undefined,
      lieuxVote: cel.lieuxVote.map((lv: any) => ({
        id: lv.id,
        codeLieuVote: lv.codeLieuVote,
        libelleLieuVote: lv.libelleLieuVote,
        codeCommune: lv.commune.codeCommune,
        libelleCommune: lv.commune.libelleCommune,
      })),
      statistiques: {
        totalLieuxVote,
        totalBureauxVote,
        totalInscrits,
        totalVotants,
        tauxParticipation: Math.round(tauxParticipation * 100) / 100,
      },
    };
  }

  /**
   * Récupérer la liste simple des CELs (pour les formulaires)
   */
  async getSimpleList(): Promise<{ codeCellule: string; libelleCellule: string }[]> {
    const cels = await this.prisma.tblCel.findMany({
      select: {
        codeCellule: true,
        libelleCellule: true,
      },
      orderBy: {
        libelleCellule: 'asc',
      },
    });

    return cels.map(cel => ({
      codeCellule: cel.codeCellule,
      libelleCellule: cel.libelleCellule,
    }));
  }

  /**
 * Récupérer les CELs d'un utilisateur à partir de ses départements
 */
async findByUserDepartments(userId: string): Promise<CelResponseDto[]> {
  const cels = await this.prisma.tblCel.findMany({
    where: {
      lieuxVote: {
        some: {
          departement: {
            numeroUtilisateur: userId
          }
        }
      }
    },
    include: {
      utilisateur: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      lieuxVote: {
        include: {
          commune: {
            select: {
              codeCommune: true,
              libelleCommune: true,
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
      },
    },
    orderBy: { libelleCellule: 'asc' },
  });

  return cels.map(cel => this.formatCelResponse(cel));
}
}
