import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  DashboardStatsDto, 
  UserDashboardStatsDto, 
  AdminDashboardStatsDto, 
  SadminDashboardStatsDto 
} from './dto/dashboard-stats.dto';
import { DashboardCelDto, DashboardCelListResponseDto, DashboardCelFilterDto } from './dto/dashboard-cel.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère les statistiques du dashboard pour un utilisateur USER
   */
  async getUserDashboardStats(userId: string): Promise<UserDashboardStatsDto> {
    // Récupérer les CELs assignées à l'utilisateur
    const celsAssignees = await this.prisma.tblCel.findMany({
      where: { numeroUtilisateur: userId },
      include: {
        lieuxVote: {
          include: {
            departement: {
              include: { region: true },
            },
            bureauxVote: true,
          },
        },
      },
    });

    const totalCels = celsAssignees.length;
    const celsAvecImport = celsAssignees.filter(cel => cel.etatResultatCellule === 'IMPORTED').length;
    const celsSansImport = totalCels - celsAvecImport;
    const tauxProgressionPersonnel = totalCels > 0 ? (celsAvecImport / totalCels) * 100 : 0;

    // Statistiques par statut
    const celsParStatut = {
      pending: celsAssignees.filter(cel => !cel.etatResultatCellule || cel.etatResultatCellule === 'PENDING').length,
      imported: celsAvecImport,
      error: celsAssignees.filter(cel => cel.etatResultatCellule === 'ERROR').length,
      processing: celsAssignees.filter(cel => cel.etatResultatCellule === 'PROCESSING').length,
    };

    // Dernier import
    const dernierImport = await this.prisma.tblImportExcelCel.findFirst({
      where: { 
        codeCellule: { in: celsAssignees.map(cel => cel.codeCellule) },
        statutImport: 'COMPLETED',
      },
      orderBy: { dateImport: 'desc' },
    });

    return {
      totalCels,
      celsAvecImport,
      celsSansImport,
      tauxProgression: tauxProgressionPersonnel,
      celsParStatut,
      dernierImport: dernierImport?.dateImport,
      nombreErreurs: celsParStatut.error,
      alertes: {
        celsSansImport,
        celsEnErreur: celsParStatut.error,
        celsEnAttente: celsParStatut.pending,
      },
      celsAssignees: totalCels,
      celsAvecImportAssignees: celsAvecImport,
      celsSansImportAssignees: celsSansImport,
      tauxProgressionPersonnel,
    };
  }

  /**
   * Récupère les statistiques du dashboard pour un utilisateur ADMIN
   */
  async getAdminDashboardStats(userId: string): Promise<AdminDashboardStatsDto> {
    // Récupérer les départements assignés à l'utilisateur
    const departementsAssignes = await this.prisma.tblDept.findMany({
      where: { numeroUtilisateur: userId },
      include: { region: true },
    });

    const codesDepartements = departementsAssignes.map(d => d.codeDepartement);

    // Récupérer toutes les CELs des départements assignés
    const cels = await this.prisma.tblCel.findMany({
      where: {
        lieuxVote: {
          some: {
            codeDepartement: { in: codesDepartements },
          },
        },
      },
      include: {
        lieuxVote: {
          include: {
            departement: {
              include: { region: true },
            },
            bureauxVote: true,
          },
        },
      },
    });

    const totalCels = cels.length;
    const celsAvecImport = cels.filter(cel => cel.etatResultatCellule === 'IMPORTED').length;
    const celsSansImport = totalCels - celsAvecImport;
    const tauxProgression = totalCels > 0 ? (celsAvecImport / totalCels) * 100 : 0;

    // Statistiques par statut
    const celsParStatut = {
      pending: cels.filter(cel => !cel.etatResultatCellule || cel.etatResultatCellule === 'PENDING').length,
      imported: celsAvecImport,
      error: cels.filter(cel => cel.etatResultatCellule === 'ERROR').length,
      processing: cels.filter(cel => cel.etatResultatCellule === 'PROCESSING').length,
    };

    // Statistiques par département
    const celsParDepartement = departementsAssignes.map(dept => {
      const celsDept = cels.filter(cel => 
        cel.lieuxVote.some(lv => lv.departement.codeDepartement === dept.codeDepartement)
      );
      const celsAvecImportDept = celsDept.filter(cel => cel.etatResultatCellule === 'IMPORTED').length;
      
      return {
        codeDepartement: dept.codeDepartement,
        libelleDepartement: dept.libelleDepartement,
        totalCels: celsDept.length,
        celsAvecImport: celsAvecImportDept,
        tauxProgression: celsDept.length > 0 ? (celsAvecImportDept / celsDept.length) * 100 : 0,
      };
    });

    // Utilisateurs actifs dans les départements
    const utilisateursActifs = await this.prisma.user.count({
      where: {
        departements: {
          some: {
            codeDepartement: { in: codesDepartements },
          },
        },
        isActive: true,
      },
    });

    return {
      totalCels,
      celsAvecImport,
      celsSansImport,
      tauxProgression,
      celsParStatut,
      nombreErreurs: celsParStatut.error,
      alertes: {
        celsSansImport,
        celsEnErreur: celsParStatut.error,
        celsEnAttente: celsParStatut.pending,
      },
      departementsAssignes: departementsAssignes.length,
      utilisateursActifs,
      celsParDepartement,
    };
  }

  /**
   * Récupère les statistiques du dashboard pour un utilisateur SADMIN
   */
  async getSadminDashboardStats(): Promise<SadminDashboardStatsDto> {
    // Récupérer toutes les CELs
    const cels = await this.prisma.tblCel.findMany({
      include: {
        lieuxVote: {
          include: {
            departement: {
              include: { region: true },
            },
            bureauxVote: true,
          },
        },
      },
    });

    const totalCels = cels.length;
    const celsAvecImport = cels.filter(cel => cel.etatResultatCellule === 'IMPORTED').length;
    const celsSansImport = totalCels - celsAvecImport;
    const tauxProgression = totalCels > 0 ? (celsAvecImport / totalCels) * 100 : 0;

    // Statistiques par statut
    const celsParStatut = {
      pending: cels.filter(cel => !cel.etatResultatCellule || cel.etatResultatCellule === 'PENDING').length,
      imported: celsAvecImport,
      error: cels.filter(cel => cel.etatResultatCellule === 'ERROR').length,
      processing: cels.filter(cel => cel.etatResultatCellule === 'PROCESSING').length,
    };

    // Statistiques par région
    const regions = await this.prisma.tblReg.findMany();
    const celsParRegion = regions.map(region => {
      const celsRegion = cels.filter(cel => 
        cel.lieuxVote.some(lv => lv.departement.codeRegion === region.codeRegion)
      );
      const celsAvecImportRegion = celsRegion.filter(cel => cel.etatResultatCellule === 'IMPORTED').length;
      
      return {
        codeRegion: region.codeRegion,
        libelleRegion: region.libelleRegion,
        totalCels: celsRegion.length,
        celsAvecImport: celsAvecImportRegion,
        tauxProgression: celsRegion.length > 0 ? (celsAvecImportRegion / celsRegion.length) * 100 : 0,
      };
    });

    // Statistiques par département
    const departements = await this.prisma.tblDept.findMany({
      include: { region: true },
    });
    const celsParDepartement = departements.map(dept => {
      const celsDept = cels.filter(cel => 
        cel.lieuxVote.some(lv => lv.departement.codeDepartement === dept.codeDepartement)
      );
      const celsAvecImportDept = celsDept.filter(cel => cel.etatResultatCellule === 'IMPORTED').length;
      
      return {
        codeDepartement: dept.codeDepartement,
        libelleDepartement: dept.libelleDepartement,
        codeRegion: dept.codeRegion,
        totalCels: celsDept.length,
        celsAvecImport: celsAvecImportDept,
        tauxProgression: celsDept.length > 0 ? (celsAvecImportDept / celsDept.length) * 100 : 0,
      };
    });

    // Utilisateurs par rôle
    const utilisateursParRole = await this.prisma.user.groupBy({
      by: ['roleId'],
      _count: { roleId: true },
    });

    // Imports par jour (derniers 30 jours)
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 30);
    
    const importsParJour = await this.prisma.tblImportExcelCel.groupBy({
      by: ['dateImport'],
      _count: { dateImport: true },
      where: {
        dateImport: { gte: dateDebut },
        statutImport: 'COMPLETED',
      },
    });

    return {
      totalCels,
      celsAvecImport,
      celsSansImport,
      tauxProgression,
      celsParStatut,
      nombreErreurs: celsParStatut.error,
      alertes: {
        celsSansImport,
        celsEnErreur: celsParStatut.error,
        celsEnAttente: celsParStatut.pending,
      },
      totalRegions: regions.length,
      totalDepartements: departements.length,
      totalUtilisateurs: await this.prisma.user.count(),
      celsParRegion,
      celsParDepartement,
      utilisateursParRole: utilisateursParRole.map(item => ({
        role: item.roleId || 'Unknown',
        count: item._count.roleId,
      })),
      importsParJour: importsParJour.map(item => ({
        date: item.dateImport.toISOString().split('T')[0],
        nombreImports: item._count.dateImport,
        nombreReussis: item._count.dateImport, // Simplifié
        nombreEchoues: 0, // À calculer si nécessaire
      })),
    };
  }

  /**
   * Récupère la liste des CELs pour le dashboard
   */
  async getDashboardCels(
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 10,
    filters: DashboardCelFilterDto = {}
  ): Promise<DashboardCelListResponseDto> {
    const skip = (page - 1) * limit;
    
    let where: any = {};
    
    // Filtrage basé sur le rôle
    if (userRole === 'USER') {
      where.numeroUtilisateur = userId;
    } else if (userRole === 'ADMIN') {
      // CELs des départements assignés à l'admin
      const departementsAssignes = await this.prisma.tblDept.findMany({
        where: { numeroUtilisateur: userId },
        select: { codeDepartement: true },
      });
      
      where.lieuxVote = {
        some: {
          codeDepartement: { in: departementsAssignes.map(d => d.codeDepartement) },
        },
      };
    }
    // SADMIN voit toutes les CELs (pas de filtre supplémentaire)

    // Appliquer les filtres
    if (filters.statutImport) {
      where.etatResultatCellule = filters.statutImport;
    }
    if (filters.typeCellule) {
      where.typeCellule = filters.typeCellule;
    }
    if (filters.search) {
      where.OR = [
        { libelleCellule: { contains: filters.search, mode: 'insensitive' } },
        { codeCellule: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [cels, total] = await Promise.all([
      this.prisma.tblCel.findMany({
        where,
        skip,
        take: limit,
        include: {
          lieuxVote: {
            include: {
              departement: {
                include: { region: true },
              },
              bureauxVote: true,
            },
          },
          utilisateur: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { libelleCellule: 'asc' },
      }),
      this.prisma.tblCel.count({ where }),
    ]);

    return {
      cels: cels.map(cel => this.formatDashboardCel(cel)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filtres: filters,
    };
  }

  /**
   * Formate une CEL pour le dashboard
   */
  private formatDashboardCel(cel: any): DashboardCelDto {
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
      libelleCellule: cel.libelleCellule,
      typeCellule: cel.typeCellule,
      etatResultatCellule: cel.etatResultatCellule,
      nombreBureauxVote: cel.nombreBureauxVote,
      departement: {
        codeDepartement: cel.lieuxVote[0]?.departement.codeDepartement || '',
        libelleDepartement: cel.lieuxVote[0]?.departement.libelleDepartement || '',
        codeRegion: cel.lieuxVote[0]?.departement.codeRegion || '',
        libelleRegion: cel.lieuxVote[0]?.departement.region.libelleRegion || '',
      },
      import: {
        aImporte: cel.etatResultatCellule === 'IMPORTED',
        dateDernierImport: cel.etatResultatCellule === 'IMPORTED' ? new Date() : undefined, // À récupérer de la table d'import
        nomFichier: undefined, // À récupérer de la table d'import
        statutImport: cel.etatResultatCellule,
        messageErreur: undefined, // À récupérer de la table d'import
      },
      statistiques: {
        totalLieuxVote,
        totalBureauxVote,
        totalInscrits,
        totalVotants,
        tauxParticipation: Math.round(tauxParticipation * 100) / 100,
      },
      utilisateur: cel.utilisateur ? {
        id: cel.utilisateur.id,
        email: cel.utilisateur.email,
        firstName: cel.utilisateur.firstName,
        lastName: cel.utilisateur.lastName,
      } : undefined,
    };
  }
}
