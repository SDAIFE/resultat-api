import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  DashboardStatsDto, 
  UserDashboardStatsDto, 
  AdminDashboardStatsDto, 
  SadminDashboardStatsDto 
} from './dto/dashboard-stats.dto';
import { DashboardCelDto, DashboardCelListResponseDto, DashboardCelFilterDto } from './dto/dashboard-cel.dto';
import { RealtimeMetricsDto } from './dto/realtime-metrics.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère les statistiques du dashboard pour un utilisateur USER
   * Optimisé pour éviter la limite de 2100 paramètres SQL Server
   */
  async getUserDashboardStats(userId: string): Promise<UserDashboardStatsDto> {
    // Récupérer les départements attribués à l'utilisateur
    const departementsAssignes = await this.prisma.tblDept.findMany({
      where: { numeroUtilisateur: userId },
      select: { codeDepartement: true },
    });

    // Construire la condition WHERE pour les CELs basée sur les départements
    let celWhereClause: any = {};
    if (departementsAssignes.length > 0) {
      celWhereClause = {
        lieuxVote: {
          some: {
            codeDepartement: { in: departementsAssignes.map(d => d.codeDepartement) },
          },
        },
      };
    } else {
      // Si l'utilisateur n'a pas de départements assignés, retourner des statistiques vides
      celWhereClause = { id: 'no-departments-assigned' };
    }

    // Utiliser des requêtes optimisées pour éviter la limite de paramètres
    const [totalCels, celsAvecImport, celsParStatut] = await Promise.all([
      this.prisma.tblCel.count({
        where: celWhereClause,
      }),
      this.prisma.tblCel.count({
        where: { 
          ...celWhereClause,
          // etatResultatCellule = 'I' ou 'PUBLISHED'
          etatResultatCellule: { in: ['I', 'PUBLISHED'] },
        },
      }),
      this.prisma.tblCel.groupBy({
        by: ['etatResultatCellule'],
        _count: { etatResultatCellule: true },
        where: celWhereClause,
      })
    ]);

    const celsSansImport = totalCels - celsAvecImport;
    const tauxProgressionPersonnel = totalCels > 0 ? (celsAvecImport / totalCels) * 100 : 0;

    // Reconstituer les statistiques par statut
    const statutMap = celsParStatut.reduce((acc, item) => {
      acc[item.etatResultatCellule || 'N'] = item._count.etatResultatCellule;
      return acc;
    }, {} as Record<string, number>);

    const celsParStatutFormatted = {
      pending: statutMap['N'] || 0,        // Non importé
      imported: statutMap['I'] || 0,       // Importé
      error: statutMap['E'] || 0,          // Erreur (si existe)
      processing: statutMap['P'] || 0,     // En cours de traitement
    };

    // Dernier import (requête optimisée) - basé sur les CELs des départements assignés
    let dernierImportWhereClause: any = { statutImport: 'COMPLETED' };
    if (departementsAssignes.length > 0) {
      // Récupérer les codes de CELs des départements assignés
      const celCodes = await this.prisma.tblCel.findMany({
        where: celWhereClause,
        select: { codeCellule: true },
      });
      
      if (celCodes.length > 0) {
        dernierImportWhereClause.codeCellule = { 
          in: celCodes.map(c => c.codeCellule) 
        };
      } else {
        // Aucune CEL trouvée, donc pas d'import possible
        dernierImportWhereClause.codeCellule = 'no-cels-found';
      }
    } else {
      // Pas de départements assignés, donc pas d'import possible
      dernierImportWhereClause.codeCellule = 'no-departments-assigned';
    }

    const dernierImport = await this.prisma.tblImportExcelCel.findFirst({
      where: dernierImportWhereClause,
      orderBy: { dateImport: 'desc' },
    });

    return {
      totalCels,
      celsAvecImport,
      celsSansImport,
      tauxProgression: tauxProgressionPersonnel,
      celsParStatut: celsParStatutFormatted,
      dernierImport: dernierImport?.dateImport,
      nombreErreurs: celsParStatutFormatted.error,
      alertes: {
        celsSansImport,
        celsEnErreur: celsParStatutFormatted.error,
        celsEnAttente: celsParStatutFormatted.pending,
      },
      celsAssignees: totalCels,
      celsAvecImportAssignees: celsAvecImport,
      celsSansImportAssignees: celsSansImport,
      tauxProgressionPersonnel,
    };
  }

  /**
   * Récupère les statistiques du dashboard pour un utilisateur ADMIN
   * Optimisé pour éviter la limite de 2100 paramètres SQL Server
   */
  async getAdminDashboardStats(userId: string): Promise<AdminDashboardStatsDto> {
    // ADMIN a exactement les mêmes données que SADMIN - pas de filtres de périmètre
    // Utiliser la même logique que getSadminDashboardStats
    return this.getSadminDashboardStats();
  }

  /**
   * Récupère les statistiques du dashboard pour un utilisateur SADMIN
   * ADMIN et SADMIN ont exactement les mêmes données (pas de filtres de périmètre)
   */
  async getSadminDashboardStats(): Promise<SadminDashboardStatsDto> {
    // 1. Statistiques générales des CELs (toutes les CELs)
    const [totalCels, celsAvecImport, celsParStatut] = await Promise.all([
      this.prisma.tblCel.count(),
      this.prisma.tblCel.count({ where: { etatResultatCellule: { in: ['I', 'PUBLISHED'] } } }),
      this.prisma.tblCel.groupBy({
        by: ['etatResultatCellule'],
        _count: { etatResultatCellule: true },
      })
    ]);

    const celsSansImport = totalCels - celsAvecImport;
    const tauxProgression = totalCels > 0 ? (celsAvecImport / totalCels) * 100 : 0;

    // Reconstituer les statistiques par statut
    const statutMap = celsParStatut.reduce((acc, item) => {
      acc[item.etatResultatCellule || 'N'] = item._count.etatResultatCellule;
      return acc;
    }, {} as Record<string, number>);

    const celsParStatutFormatted = {
      pending: statutMap['N'] || 0,        // Non importé
      imported: statutMap['I'] || 0,       // Importé
      error: statutMap['E'] || 0,          // Erreur (si existe)
      processing: statutMap['P'] || 0,     // En cours de traitement
    };

    // 2. Métriques communes ADMIN/SADMIN
    const regions = await this.prisma.tblReg.findMany();
    const departements = await this.prisma.tblDept.findMany();
    const totalUtilisateurs = await this.prisma.user.count();

    // Utilisateurs par rôle
    const utilisateursParRole = await this.prisma.user.groupBy({
      by: ['roleId'],
      _count: { roleId: true },
    });

    // Imports par jour (derniers 7 jours seulement)
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 7);
    
    // Récupérer les fichiers CEL importés par jour (pas les lignes)
    const importsRecents = await this.prisma.tblImportExcelCel.findMany({
      where: {
        dateImport: { gte: dateDebut },
        statutImport: 'COMPLETED',
      },
      select: {
        dateImport: true,
        codeCellule: true,
        nomFichier: true,
      },
    });

    // Grouper par date et compter les fichiers uniques (codeCellule + nomFichier)
    const importsParJourMap = new Map<string, Set<string>>();
    importsRecents.forEach(import_ => {
      const dateStr = import_.dateImport.toISOString().split('T')[0];
      const fileKey = `${import_.codeCellule}-${import_.nomFichier}`;
      
      if (!importsParJourMap.has(dateStr)) {
        importsParJourMap.set(dateStr, new Set());
      }
      importsParJourMap.get(dateStr)!.add(fileKey);
    });

    const importsParJour = Array.from(importsParJourMap.entries()).map(([date, fileSet]) => ({
      dateImport: new Date(date),
      _count: { dateImport: fileSet.size }, // Nombre de fichiers uniques
    }));

    // 3. Pour SADMIN, pas de départements assignés spécifiques
    const departementsAssignes = await this.prisma.tblDept.findMany();
    const utilisateursActifs = await this.prisma.user.count({
      where: { isActive: true },
    });

    // 4. Statistiques par département (tous les départements pour SADMIN)
    const celsParDepartement = await Promise.all(
      departements.map(async (dept) => {
        const totalCelsDept = await this.prisma.tblCel.count({
          where: {
            lieuxVote: {
              some: {
                codeDepartement: dept.codeDepartement,
              },
            },
          },
        });

        const celsAvecImportDept = await this.prisma.tblCel.count({
          where: {
            etatResultatCellule: { in: ['I', 'PUBLISHED'] },
            lieuxVote: {
              some: {
                codeDepartement: dept.codeDepartement,
              },
            },
          },
        });

        return {
          codeDepartement: dept.codeDepartement,
          libelleDepartement: dept.libelleDepartement,
          totalCels: totalCelsDept,
          celsAvecImport: celsAvecImportDept,
          tauxProgression: totalCelsDept > 0 ? (celsAvecImportDept / totalCelsDept) * 100 : 0,
        };
      })
    );

    return {
      totalCels,
      celsAvecImport,
      celsSansImport,
      tauxProgression,
      celsParStatut: celsParStatutFormatted,
      nombreErreurs: celsParStatutFormatted.error,
      alertes: {
        celsSansImport,
        celsEnErreur: celsParStatutFormatted.error,
        celsEnAttente: celsParStatutFormatted.pending,
      },
      // Métriques communes ADMIN/SADMIN
      totalRegions: regions.length,
      totalDepartements: departements.length,
      totalUtilisateurs,
      utilisateursParRole: utilisateursParRole.map(item => ({
        role: item.roleId || 'Unknown',
        count: item._count.roleId,
      })),
      importsParJour: importsParJour.map(item => ({
        date: item.dateImport.toISOString().split('T')[0],
        nombreImports: item._count.dateImport,
        nombreReussis: item._count.dateImport,
        nombreEchoues: 0,
      })),
      // Métriques spécifiques ADMIN (tous les départements pour SADMIN)
      departementsAssignes: departementsAssignes.length,
      utilisateursActifs,
      celsParDepartement,
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
      // Récupérer les CELs à partir des départements attribués à l'utilisateur
      const departementsAssignes = await this.prisma.tblDept.findMany({
        where: { numeroUtilisateur: userId },
        select: { codeDepartement: true },
      });
      
      if (departementsAssignes.length > 0) {
        where.lieuxVote = {
          some: {
            codeDepartement: { in: departementsAssignes.map(d => d.codeDepartement) },
          },
        };
      } else {
        // Si l'utilisateur n'a pas de départements assignés, retourner un résultat vide
        where.id = 'no-departments-assigned';
      }
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
        { libelleCellule: { contains: filters.search } },
        { codeCellule: { contains: filters.search } },
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
    console.log(cels);
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
        aImporte: cel.etatResultatCellule === 'I',
        dateDernierImport: cel.etatResultatCellule === 'I' ? new Date() : undefined, // À récupérer de la table d'import
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

  // ===========================================
  // MÉTHODES SELON LES DIRECTIVES
  // ===========================================

  /**
   * Récupère les métriques en temps réel
   * Optimisé pour des mises à jour fréquentes
   */
  async getRealtimeMetrics(userId: string, userRole: string): Promise<RealtimeMetricsDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Métriques de base selon le rôle
    let baseMetrics: any;
    
    if (userRole === 'USER') {
      baseMetrics = await this.getUserDashboardStats(userId);
    } else if (userRole === 'ADMIN') {
      baseMetrics = await this.getAdminDashboardStats(userId);
    } else {
      baseMetrics = await this.getSadminDashboardStats();
    }

    // Ajouter des métriques temps réel
    const realtimeData = {
      ...baseMetrics,
      timestamp: now,
      // Activité récente (dernières 24h)
      activiteRecente: await this.getActiviteRecente(userId, userRole, today),
      // Imports en cours
      importsEnCours: await this.getImportsEnCours(userId, userRole),
      // Alertes critiques
      alertesCritiques: await this.getAlertesCritiques(userId, userRole),
    };

    return realtimeData;
  }

  /**
   * Rafraîchit les métriques (invalidation du cache)
   */
  async refreshMetrics(userId: string, userRole: string): Promise<void> {
    // Ici on pourrait implémenter l'invalidation du cache Redis
    // Pour l'instant, on force le recalcul des métriques
    
    // Log de l'action de rafraîchissement
    console.log(`Métriques rafraîchies pour l'utilisateur ${userId} avec le rôle ${userRole} à ${new Date().toISOString()}`);
    
    // Si vous utilisez Redis, vous pourriez faire :
    // await this.redisService.del(`dashboard:${userRole}:${userId}`);
    // await this.redisService.del(`dashboard:realtime:${userRole}:${userId}`);
  }

  /**
   * Récupère l'activité récente (dernières 24h)
   */
  private async getActiviteRecente(userId: string, userRole: string, depuis: Date): Promise<any> {
    const activite = {
      importsAujourdhui: 0,
      publicationsAujourdhui: 0,
      connexionsAujourdhui: 0,
    };

    // Imports aujourd'hui selon le rôle (compter les fichiers CEL, pas les lignes)
    if (userRole === 'USER') {
      const importsUser = await this.prisma.tblImportExcelCel.findMany({
        where: {
          numeroUtilisateur: userId,
          dateImport: { gte: depuis },
          statutImport: 'COMPLETED',
        },
        select: {
          codeCellule: true,
          nomFichier: true,
        },
      });
      
      // Compter les fichiers uniques
      const fichiersUniques = new Set(importsUser.map(imp => `${imp.codeCellule}-${imp.nomFichier}`));
      activite.importsAujourdhui = fichiersUniques.size;
      
    } else {
      // ADMIN et SADMIN - tous les imports (mêmes données)
      const importsAdminSadmin = await this.prisma.tblImportExcelCel.findMany({
        where: {
          dateImport: { gte: depuis },
          statutImport: 'COMPLETED',
        },
        select: {
          codeCellule: true,
          nomFichier: true,
        },
      });
      
      // Compter les fichiers uniques
      const fichiersUniques = new Set(importsAdminSadmin.map(imp => `${imp.codeCellule}-${imp.nomFichier}`));
      activite.importsAujourdhui = fichiersUniques.size;
    }

    // Publications aujourd'hui
    activite.publicationsAujourdhui = await this.prisma.departmentPublicationHistory.count({
      where: {
        userId: userRole === 'USER' ? userId : undefined,
        action: 'PUBLISH',
        timestamp: { gte: depuis },
      },
    });

    return activite;
  }

  /**
   * Récupère les imports en cours
   */
  private async getImportsEnCours(userId: string, userRole: string): Promise<any> {
    let whereClause: any = {
      statutImport: 'PROCESSING',
    };

    if (userRole === 'USER') {
      whereClause.numeroUtilisateur = userId;
    } else {
      // ADMIN et SADMIN - tous les imports en cours (mêmes données)
      // Pas de filtre supplémentaire
    }

    const importsEnCours = await this.prisma.tblImportExcelCel.findMany({
      where: whereClause,
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { dateImport: 'desc' },
      take: 10,
    });

    return {
      nombre: importsEnCours.length,
      liste: importsEnCours.map(importItem => ({
        codeCellule: importItem.codeCellule,
        nomFichier: importItem.nomFichier,
        dateImport: importItem.dateImport,
        utilisateur: importItem.utilisateur,
        messageErreur: importItem.messageErreur,
      })),
    };
  }

  /**
   * Récupère les alertes critiques
   */
  private async getAlertesCritiques(userId: string, userRole: string): Promise<any> {
    const alertes = {
      celsEnErreurCritique: 0,
      importsBloques: 0,
      utilisateursInactifs: 0,
      departementsNonPublies: 0,
    };

    // CELs en erreur critique (plus de 3 tentatives)
    if (userRole === 'USER') {
      alertes.celsEnErreurCritique = await this.prisma.tblCel.count({
        where: {
          numeroUtilisateur: userId,
          etatResultatCellule: 'E',
        },
      });
    } else {
      // ADMIN et SADMIN - toutes les CELs en erreur (mêmes données)
      alertes.celsEnErreurCritique = await this.prisma.tblCel.count({
        where: { etatResultatCellule: 'E' },
      });
    }

    // Imports bloqués (en processing depuis plus de 1 heure)
    const uneHeureAgo = new Date(Date.now() - 60 * 60 * 1000);
    alertes.importsBloques = await this.prisma.tblImportExcelCel.count({
      where: {
        statutImport: 'PROCESSING',
        dateImport: { lt: uneHeureAgo },
      },
    });

    // Utilisateurs inactifs (SADMIN seulement)
    if (userRole === 'SADMIN') {
      alertes.utilisateursInactifs = await this.prisma.user.count({
        where: { isActive: false },
      });
    }

    // Départements non publiés (ADMIN et SADMIN)
    if (userRole === 'ADMIN') {
      alertes.departementsNonPublies = await this.prisma.tblDept.count({
        where: {
          numeroUtilisateur: userId,
          statutPublication: { not: 'PUBLISHED' },
        },
      });
    } else if (userRole === 'SADMIN') {
      alertes.departementsNonPublies = await this.prisma.tblDept.count({
        where: {
          statutPublication: { not: 'PUBLISHED' },
        },
      });
    }

    return alertes;
  }
}
