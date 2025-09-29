import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  DepartmentStatsResponse, 
  DepartmentData, 
  DepartmentListResponse, 
  PublicationActionResult,
  DepartmentDetailsResponse,
  DepartmentListQuery,
  CelData
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
}
