import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  DepartmentStatsResponse, 
  DepartmentData, 
  DepartmentListResponse, 
  PublicationActionResult,
  DepartmentDetailsResponse,
  DepartmentListQuery,
  CelData,
  DepartmentDataResponse,
  DepartmentAggregatedData,
  CelAggregatedData
} from './dto/publication-response.dto';

@Injectable()
export class PublicationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupérer les statistiques globales des départements
   */
  async getStats(userId?: string, userRole?: string): Promise<DepartmentStatsResponse> {
    // Construire la condition WHERE selon le rôle
    const departmentWhere: any = {};
    const celWhere: any = {};
    
    // Pour USER : seulement les départements assignés
    if (userRole === 'USER' && userId) {
      departmentWhere.numeroUtilisateur = userId;
      
      // Pour les CELs, filtrer par les départements assignés à l'utilisateur
      const userDepartments = await this.prisma.tblDept.findMany({
        where: { numeroUtilisateur: userId },
        select: { codeDepartement: true }
      });
      
      const departmentCodes = userDepartments.map(d => d.codeDepartement);
      
      if (departmentCodes.length > 0) {
        celWhere.lieuxVote = {
          some: {
            departement: {
              codeDepartement: { in: departmentCodes }
            }
          }
        };
      } else {
        // Si aucun département assigné, retourner des stats vides
        return {
          totalDepartments: 0,
          publishedDepartments: 0,
          pendingDepartments: 0,
          totalCels: 0,
          importedCels: 0,
          pendingCels: 0,
          publicationRate: 0
        };
      }
    }
    // Pour ADMIN et SADMIN : toutes les données (pas de filtre)

    // Compter les départements
    const totalDepartments = await this.prisma.tblDept.count({ where: departmentWhere });
    
    // Compter les départements publiés
    const publishedDepartments = await this.prisma.tblDept.count({
      where: { 
        ...departmentWhere,
        statutPublication: 'PUBLISHED' 
      }
    });
    
    // Compter les départements en attente
    const pendingDepartments = await this.prisma.tblDept.count({
      where: { 
        ...departmentWhere,
        statutPublication: { not: 'PUBLISHED' }
      }
    });

    // Compter les CELs
    const totalCels = await this.prisma.tblCel.count({ where: celWhere });
    
    // CELs importées (statut I + P)
    const importedCels = await this.prisma.tblCel.count({
      where: { 
        ...celWhere,
        etatResultatCellule: { in: ['I', 'P'] } 
      }
    });
    
    // CELs en attente (statut N)
    const pendingCels = await this.prisma.tblCel.count({
      where: { 
        ...celWhere,
        etatResultatCellule: 'N' 
      }
    });

    // Calculer le taux de publication
    const publicationRate = totalDepartments > 0 
      ? Math.round((publishedDepartments / totalDepartments) * 100 * 100) / 100
      : 0;

    return {
      totalDepartments,
      publishedDepartments,
      pendingDepartments,
      totalCels,
      importedCels,
      pendingCels,
      publicationRate
    };
  }

  /**
   * Récupérer la liste des départements avec leurs métriques
   */
  async getDepartments(query: DepartmentListQuery, userId?: string, userRole?: string): Promise<DepartmentListResponse> {
    const {
      page = 1,
      limit = 10,
      codeDepartement,
      publicationStatus,
      search
    } = query;

    // Construire les filtres
    const where: any = {};
    
    // Pour USER : seulement les départements assignés
    if (userRole === 'USER' && userId) {
      where.numeroUtilisateur = userId;
    }
    // Pour ADMIN et SADMIN : toutes les données (pas de filtre)
    
    if (codeDepartement) {
      where.codeDepartement = codeDepartement;
    }
    
    if (publicationStatus) {
      where.statutPublication = publicationStatus;
    }
    
    if (search) {
      where.OR = [
        { libelleDepartement: { contains: search } },
        { codeDepartement: { contains: search } }
      ];
    }

    // Compter le total
    const total = await this.prisma.tblDept.count({ where });

    // Récupérer les départements avec pagination
    const departements = await this.prisma.tblDept.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { libelleDepartement: 'asc' }
    });

    // Calculer les métriques pour chaque département
    const departmentsWithMetrics = await Promise.all(
      departements.map(async (dept) => {
        const cels = await this.prisma.tblCel.findMany({
          where: { 
            lieuxVote: {
              some: {
                departement: {
                  codeDepartement: dept.codeDepartement
                }
              }
            }
          }
        });

        const totalCels = cels.length;
        const importedCels = cels.filter(cel => cel.etatResultatCellule && ['I', 'P'].includes(cel.etatResultatCellule)).length;
        const pendingCels = cels.filter(cel => cel.etatResultatCellule === 'N').length;

        return {
          id: dept.id,
          codeDepartement: dept.codeDepartement,
          libelleDepartement: dept.libelleDepartement,
          totalCels,
          importedCels,
          pendingCels,
          publicationStatus: this.mapPublicationStatus(dept.statutPublication),
          lastUpdate: new Date().toISOString(),
          cels: cels.map(cel => ({
            codeCellule: cel.codeCellule,
            libelleCellule: cel.libelleCellule,
            statut: cel.etatResultatCellule as 'N' | 'I' | 'P',
            dateImport: new Date().toISOString()
          }))
        };
      })
    );

    return {
      departments: departmentsWithMetrics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Publier un département
   */
  async publishDepartment(departmentId: string, userId: string): Promise<PublicationActionResult> {
    // Vérifier que le département existe
    const department = await this.prisma.tblDept.findUnique({
      where: { id: departmentId },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!department) {
      throw new NotFoundException('Département non trouvé');
    }

    // Vérifier que toutes les CELs sont importées
    const cels = await this.prisma.tblCel.findMany({
      where: { 
        lieuxVote: {
          some: {
            departement: {
              codeDepartement: department.codeDepartement
            }
          }
        }
      }
    });

    const pendingCels = cels.filter(cel => cel.etatResultatCellule === 'N');
    
    if (pendingCels.length > 0) {
      throw new BadRequestException(
        `Impossible de publier le département. ${pendingCels.length} CEL(s) ne sont pas encore importées.`
      );
    }

    // Mettre à jour le statut de publication
    await this.prisma.tblDept.update({
      where: { id: departmentId },
      data: { statutPublication: 'PUBLISHED' }
    });

    // Enregistrer l'historique
    await this.prisma.departmentPublicationHistory.create({
      data: {
        departmentId,
        action: 'PUBLISH',
        userId,
        details: `Département ${department.libelleDepartement} publié avec succès`
      }
    });

    // Préparer la réponse
    const departmentData: DepartmentData = {
      id: department.id,
      codeDepartement: department.codeDepartement,
      libelleDepartement: department.libelleDepartement,
      totalCels: cels.length,
      importedCels: cels.filter(cel => cel.etatResultatCellule && ['I', 'P'].includes(cel.etatResultatCellule)).length,
      pendingCels: 0,
      publicationStatus: 'PUBLISHED',
      lastUpdate: new Date().toISOString(),
      cels: cels.map(cel => ({
        codeCellule: cel.codeCellule,
        libelleCellule: cel.libelleCellule,
        statut: cel.etatResultatCellule as 'N' | 'I' | 'P',
        dateImport: new Date().toISOString()
      }))
    };

    return {
      success: true,
      message: `Département ${department.libelleDepartement} publié avec succès`,
      department: departmentData
    };
  }

  /**
   * Annuler la publication d'un département
   */
  async cancelPublication(departmentId: string, userId: string): Promise<PublicationActionResult> {
    // Vérifier que le département existe
    const department = await this.prisma.tblDept.findUnique({
      where: { id: departmentId },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!department) {
      throw new NotFoundException('Département non trouvé');
    }

    // Mettre à jour le statut de publication
    await this.prisma.tblDept.update({
      where: { id: departmentId },
      data: { statutPublication: 'CANCELLED' }
    });

    // Enregistrer l'historique
    await this.prisma.departmentPublicationHistory.create({
      data: {
        departmentId,
        action: 'CANCEL',
        userId,
        details: `Publication du département ${department.libelleDepartement} annulée`
      }
    });

    // Récupérer les CELs pour la réponse
    const cels = await this.prisma.tblCel.findMany({
      where: { 
        lieuxVote: {
          some: {
            departement: {
              codeDepartement: department.codeDepartement
            }
          }
        }
      }
    });

    const departmentData: DepartmentData = {
      id: department.id,
      codeDepartement: department.codeDepartement,
      libelleDepartement: department.libelleDepartement,
      totalCels: cels.length,
      importedCels: cels.filter(cel => cel.etatResultatCellule && ['I', 'P'].includes(cel.etatResultatCellule)).length,
      pendingCels: cels.filter(cel => cel.etatResultatCellule === 'N').length,
      publicationStatus: 'CANCELLED',
      lastUpdate: new Date().toISOString(),
      cels: cels.map(cel => ({
        codeCellule: cel.codeCellule,
        libelleCellule: cel.libelleCellule,
        statut: cel.etatResultatCellule as 'N' | 'I' | 'P',
        dateImport: new Date().toISOString()
      }))
    };

    return {
      success: true,
      message: `Publication du département ${department.libelleDepartement} annulée`,
      department: departmentData
    };
  }

  /**
   * Récupérer les détails complets d'un département
   */
  async getDepartmentDetails(departmentId: string): Promise<DepartmentDetailsResponse> {
    // Vérifier que le département existe
    const department = await this.prisma.tblDept.findUnique({
      where: { id: departmentId },
      include: {
        region: true,
        utilisateur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!department) {
      throw new NotFoundException('Département non trouvé');
    }

    // Récupérer les CELs
    const cels = await this.prisma.tblCel.findMany({
      where: { 
        lieuxVote: {
          some: {
            departement: {
              codeDepartement: department.codeDepartement
            }
          }
        }
      }
    });

    // Récupérer l'historique des publications
    const history = await this.prisma.departmentPublicationHistory.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const departmentData: DepartmentData = {
      id: department.id,
      codeDepartement: department.codeDepartement,
      libelleDepartement: department.libelleDepartement,
      totalCels: cels.length,
      importedCels: cels.filter(cel => cel.etatResultatCellule && ['I', 'P'].includes(cel.etatResultatCellule)).length,
      pendingCels: cels.filter(cel => cel.etatResultatCellule === 'N').length,
      publicationStatus: this.mapPublicationStatus(department.statutPublication),
      lastUpdate: new Date().toISOString(),
      cels: cels.map(cel => ({
        codeCellule: cel.codeCellule,
        libelleCellule: cel.libelleCellule,
        statut: cel.etatResultatCellule as 'N' | 'I' | 'P',
        dateImport: new Date().toISOString()
      }))
    };

    return {
      department: departmentData,
      cels: cels.map(cel => ({
        codeCellule: cel.codeCellule,
        libelleCellule: cel.libelleCellule,
        statut: cel.etatResultatCellule as 'N' | 'I' | 'P',
        dateImport: new Date().toISOString(),
        nombreLignesImportees: 0,
        nombreLignesEnErreur: 0
      })),
      history: history.map(h => ({
        action: h.action as 'PUBLISH' | 'CANCEL' | 'IMPORT',
        timestamp: h.timestamp.toISOString(),
        user: `${h.user.firstName} ${h.user.lastName}`,
        details: h.details || undefined
      }))
    };
  }

  /**
   * Mapper le statut de publication
   */
  private mapPublicationStatus(statut: string | null): 'PUBLISHED' | 'CANCELLED' | 'PENDING' {
    switch (statut) {
      case 'PUBLISHED':
        return 'PUBLISHED';
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Récupérer les données agrégées par département avec CELs
   * Optimisé pour éviter la limite de 2100 paramètres SQL Server
   */
  async getDepartmentsData(
    query: { page: number; limit: number; codeDepartement?: string; search?: string },
    userId?: string,
    userRole?: string
  ): Promise<DepartmentDataResponse> {
    const { page, limit, codeDepartement, search } = query;
    const skip = (page - 1) * limit;

    // Construire la condition WHERE selon le rôle
    let departmentWhere: any = {};
    
    // Pour USER : seulement les départements assignés
    if (userRole === 'USER' && userId) {
      departmentWhere.numeroUtilisateur = userId;
    }
    // Pour ADMIN et SADMIN : tous les départements (pas de filtre)

    // Ajouter les filtres optionnels
    if (codeDepartement) {
      departmentWhere.codeDepartement = codeDepartement;
    }
    
    if (search) {
      departmentWhere.libelleDepartement = {
        contains: search,
      };
    }

    // 1. Récupérer les départements avec pagination
    const [departments, total] = await Promise.all([
      this.prisma.tblDept.findMany({
        where: departmentWhere,
        skip,
        take: limit,
        orderBy: { codeDepartement: 'asc' },
        select: {
          id: true,
          codeDepartement: true,
          libelleDepartement: true
        }
      }),
      this.prisma.tblDept.count({ where: departmentWhere })
    ]);

    // 2. Pour chaque département, récupérer les CELs avec données agrégées
    const departmentsData = await Promise.all(
      departments.map(async (dept) => {
        // Récupérer les CELs de ce département (statut I ou P)
        const cels = await this.prisma.tblCel.findMany({
          where: {
            etatResultatCellule: { in: ['I', 'P'] },
            lieuxVote: {
              some: {
                codeDepartement: dept.codeDepartement
              }
            }
          },
          select: {
            codeCellule: true,
            libelleCellule: true
          }
        });

        // Récupérer les données d'import pour ces CELs
        const celCodes = cels.map(cel => cel.codeCellule);
        const importData = await this.prisma.tblImportExcelCel.findMany({
          where: {
            codeCellule: { in: celCodes },
            statutImport: 'COMPLETED'
          },
          select: {
            codeCellule: true,
            populationHommes: true,
            populationFemmes: true,
            populationTotale: true,
            personnesAstreintes: true,
            votantsHommes: true,
            votantsFemmes: true,
            totalVotants: true,
            tauxParticipation: true,
            bulletinsNuls: true,
            suffrageExprime: true,
            bulletinsBlancs: true,
            score1: true,
            score2: true,
            score3: true,
            score4: true,
            score5: true
          }
        });

        // Grouper les données par CEL
        const celDataMap = new Map<string, any[]>();
        importData.forEach(data => {
          if (!celDataMap.has(data.codeCellule)) {
            celDataMap.set(data.codeCellule, []);
          }
          celDataMap.get(data.codeCellule)!.push(data);
        });

        // Agréger les données par CEL
        const celsAggregated: CelAggregatedData[] = cels.map(cel => {
          const celData = celDataMap.get(cel.codeCellule) || [];
          
          // Calculer les totaux pour cette CEL
          const aggregated = celData.reduce((acc, data) => {
            acc.populationHommes += this.parseNumber(data.populationHommes) || 0;
            acc.populationFemmes += this.parseNumber(data.populationFemmes) || 0;
            acc.populationTotale += this.parseNumber(data.populationTotale) || 0;
            acc.personnesAstreintes += this.parseNumber(data.personnesAstreintes) || 0;
            acc.votantsHommes += this.parseNumber(data.votantsHommes) || 0;
            acc.votantsFemmes += this.parseNumber(data.votantsFemmes) || 0;
            acc.totalVotants += this.parseNumber(data.totalVotants) || 0;
            acc.bulletinsNuls += this.parseNumber(data.bulletinsNuls) || 0;
            acc.suffrageExprime += this.parseNumber(data.suffrageExprime) || 0;
            acc.bulletinsBlancs += this.parseNumber(data.bulletinsBlancs) || 0;
            acc.score1 += this.parseNumber(data.score1) || 0;
            acc.score2 += this.parseNumber(data.score2) || 0;
            acc.score3 += this.parseNumber(data.score3) || 0;
            acc.score4 += this.parseNumber(data.score4) || 0;
            acc.score5 += this.parseNumber(data.score5) || 0;
            
            // Calculer le taux de participation moyen
            const tauxParticipation = this.parsePercentage(data.tauxParticipation) || 0;
            acc.tauxParticipationSum += tauxParticipation;
            acc.tauxParticipationCount++;
            
            return acc;
          }, {
            populationHommes: 0,
            populationFemmes: 0,
            populationTotale: 0,
            personnesAstreintes: 0,
            votantsHommes: 0,
            votantsFemmes: 0,
            totalVotants: 0,
            tauxParticipationSum: 0,
            tauxParticipationCount: 0,
            bulletinsNuls: 0,
            suffrageExprime: 0,
            bulletinsBlancs: 0,
            score1: 0,
            score2: 0,
            score3: 0,
            score4: 0,
            score5: 0
          });

          return {
            codeCellule: cel.codeCellule,
            libelleCellule: cel.libelleCellule,
            populationHommes: aggregated.populationHommes,
            populationFemmes: aggregated.populationFemmes,
            populationTotale: aggregated.populationTotale,
            personnesAstreintes: aggregated.personnesAstreintes,
            votantsHommes: aggregated.votantsHommes,
            votantsFemmes: aggregated.votantsFemmes,
            totalVotants: aggregated.totalVotants,
            tauxParticipation: aggregated.tauxParticipationCount > 0 
              ? Math.round((aggregated.tauxParticipationSum / aggregated.tauxParticipationCount) * 100) / 100 
              : 0,
            bulletinsNuls: aggregated.bulletinsNuls,
            suffrageExprime: aggregated.suffrageExprime,
            bulletinsBlancs: aggregated.bulletinsBlancs,
            score1: aggregated.score1,
            score2: aggregated.score2,
            score3: aggregated.score3,
            score4: aggregated.score4,
            score5: aggregated.score5,
            nombreBureaux: celData.length
          };
        });

        // Calculer les métriques du département
        const deptMetrics = celsAggregated.reduce((acc, cel) => {
          acc.inscrits += cel.populationTotale;
          acc.votants += cel.totalVotants;
          acc.nombreBureaux += celDataMap.get(cel.codeCellule)?.length || 0;
          return acc;
        }, { inscrits: 0, votants: 0, nombreBureaux: 0 });

        const participation = deptMetrics.inscrits > 0 
          ? Math.round((deptMetrics.votants / deptMetrics.inscrits) * 100 * 100) / 100 
          : 0;

        return {
          codeDepartement: dept.codeDepartement,
          libelleDepartement: dept.libelleDepartement,
          inscrits: deptMetrics.inscrits,
          votants: deptMetrics.votants,
          participation,
          nombreBureaux: deptMetrics.nombreBureaux,
          cels: celsAggregated
        };
      })
    );

    return {
      departments: departmentsData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Convertit une chaîne en nombre, retourne 0 si invalide
   */
  private parseNumber(value: string | null | undefined): number {
    if (!value || value === '') return 0;
    
    // Nettoyer la valeur (enlever les virgules, espaces, etc.)
    const cleaned = value.toString().replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }

  /**
   * Convertit un pourcentage en nombre décimal
   */
  private parsePercentage(value: string | null | undefined): number {
    if (!value || value === '') return 0;
    
    // Nettoyer la valeur (enlever le % et les espaces)
    const cleaned = value.toString().replace(/[%\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }
}
