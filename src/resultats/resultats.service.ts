import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CacheService } from './cache.service';
import { 
  ElectionResultsResponseDto, 
  ElectionResultsDto, 
  ElectionResultsQueryDto,
  CandidateDto,
  TotalsDto,
  StatisticsDto,
  RegionDto,
  DepartementDto,
  LieuVoteDto,
  BureauDto,
  ResultDto,
  TrendDto,
  PartyDto
} from './dto/election-results.dto';
import { 
  ElectionHeaderResponseDto,
  ElectionHeaderDto
} from './dto/election-header.dto';
import { 
  PublishedZonesResponseDto,
  PublishedZonesDto,
  RegionDto as PublishedRegionDto,
  DepartmentDto as PublishedDepartmentDto,
  VotingPlaceDto,
  PollingStationDto
} from './dto/published-zones.dto';
import { 
  ResultsByZoneResponseDto,
  ResultsByZoneDto,
  ResultsByZoneQueryDto,
  ZoneInfoDto,
  StatisticsDto as ZoneStatisticsDto,
  CandidateResultDto,
  SummaryDto,
  ZoneType
} from './dto/results-by-zone.dto';

@Injectable()
export class ResultatsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService
  ) {}

  /**
   * Récupérer les résultats électoraux par zone
   */
  async getResultsByZone(electionId: string, query: ResultsByZoneQueryDto): Promise<ResultsByZoneResponseDto> {
    try {
      // Validation de l'electionId
      if (!electionId || electionId.trim() === '') {
        throw new BadRequestException('L\'identifiant de l\'élection est requis');
      }

      // Validation des paramètres de zone
      const { regionId, departmentId, votingPlaceId, pollingStationId } = query;
      if (!regionId && !departmentId && !votingPlaceId && !pollingStationId) {
        throw new BadRequestException('Au moins un paramètre de zone doit être fourni');
      }

      // Déterminer le type de zone et construire la clé de cache
      const zoneType = this.determineZoneType(query);
      const cacheKey = `results_by_zone:${electionId}:${zoneType}:${JSON.stringify(query)}`;
      
      // Vérification du cache
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Récupérer les données selon le niveau de zone
      let zoneInfo: ZoneInfoDto;
      let statistics: ZoneStatisticsDto;
      let results: CandidateResultDto[];

      switch (zoneType) {
        case ZoneType.POLLING_STATION:
          ({ zoneInfo, statistics, results } = await this.getPollingStationResults(query));
          break;
        case ZoneType.VOTING_PLACE:
          ({ zoneInfo, statistics, results } = await this.getVotingPlaceResults(query));
          break;
        case ZoneType.DEPARTMENT:
          ({ zoneInfo, statistics, results } = await this.getDepartmentResults(query));
          break;
        case ZoneType.REGION:
          ({ zoneInfo, statistics, results } = await this.getRegionResults(query));
          break;
        default:
          throw new BadRequestException('Type de zone non supporté');
      }

      // Calculer le résumé
      const summary = this.calculateSummary(results);

      const resultsByZoneData: ResultsByZoneDto = {
        electionId: electionId,
        electionName: 'Élection Présidentielle 2025 - Premier Tour',
        zoneInfo,
        statistics,
        results,
        summary
      };

      const result: ResultsByZoneResponseDto = {
        success: true,
        data: resultsByZoneData,
        message: 'Résultats récupérés avec succès',
        timestamp: new Date().toISOString()
      };

      // Mise en cache du résultat (TTL de 2 minutes)
      this.cacheService.set(cacheKey, result, 120);

      return result;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(`Zone non trouvée ou sans résultats publiés`);
    }
  }

  /**
   * Déterminer le type de zone basé sur les paramètres
   */
  private determineZoneType(query: ResultsByZoneQueryDto): ZoneType {
    if (query.pollingStationId) return ZoneType.POLLING_STATION;
    if (query.votingPlaceId) return ZoneType.VOTING_PLACE;
    if (query.departmentId) return ZoneType.DEPARTMENT;
    if (query.regionId) return ZoneType.REGION;
    throw new BadRequestException('Impossible de déterminer le type de zone');
  }

  /**
   * Récupérer les résultats d'un bureau de vote spécifique
   */
  private async getPollingStationResults(query: ResultsByZoneQueryDto): Promise<{
    zoneInfo: ZoneInfoDto;
    statistics: ZoneStatisticsDto;
    results: CandidateResultDto[];
  }> {
    const bureau = await this.prisma.tblBv.findFirst({
      where: {
        id: query.pollingStationId,
        departement: {
          OR: [
            { statutPublication: 'PUBLIE' },
            { statutPublication: 'PUBLIÉ' },
            { statutPublication: 'PUBLISHED' },
            { statutPublication: 'ACTIF' },
            { statutPublication: 'ACTIVE' },
            { statutPublication: 'EN_COURS' },
            { statutPublication: 'EN COURS' },
            { statutPublication: 'IN_PROGRESS' }
          ]
        }
      },
      include: {
        departement: {
          include: {
            region: true
          }
        },
        lieuVote: true
      }
    });

    if (!bureau) {
      throw new NotFoundException('Bureau de vote non trouvé ou non publié');
    }

    const zoneInfo: ZoneInfoDto = {
      type: ZoneType.POLLING_STATION,
      id: bureau.id,
      name: `Bureau ${bureau.numeroBureauVote}`,
      parentZone: {
        type: 'votingPlace',
        name: bureau.lieuVote.libelleLieuVote
      }
    };

    const statistics: ZoneStatisticsDto = {
      totalInscrits: bureau.inscrits || 0,
      totalVotants: bureau.totalVotants || 0,
      tauxParticipation: bureau.tauxParticipation || 0,
      totalExprimes: (bureau.totalVotants || 0) - (bureau.bulletinsNuls || 0) - (bureau.bulletinsBlancs || 0),
      totalBlancs: bureau.bulletinsBlancs || 0,
      totalNuls: bureau.bulletinsNuls || 0,
      nombreBureaux: 1,
      nombreLieuxVote: 1,
      nombreDepartements: 1
    };

    const results = await this.calculateCandidateResultsForZone([
      { type: 'pollingStation', id: bureau.id, name: bureau.numeroBureauVote || bureau.id }
    ]);

    return { zoneInfo, statistics, results };
  }

  /**
   * Récupérer les résultats d'un lieu de vote (agrégation des bureaux)
   */
  private async getVotingPlaceResults(query: ResultsByZoneQueryDto): Promise<{
    zoneInfo: ZoneInfoDto;
    statistics: ZoneStatisticsDto;
    results: CandidateResultDto[];
  }> {
    const lieuVote = await this.prisma.tblLv.findFirst({
      where: {
        id: query.votingPlaceId,
        departement: {
          OR: [
            { statutPublication: 'PUBLIE' },
            { statutPublication: 'PUBLIÉ' },
            { statutPublication: 'PUBLISHED' },
            { statutPublication: 'ACTIF' },
            { statutPublication: 'ACTIVE' },
            { statutPublication: 'EN_COURS' },
            { statutPublication: 'EN COURS' },
            { statutPublication: 'IN_PROGRESS' }
          ]
        }
      },
      include: {
        departement: {
          include: {
            region: true
          }
        },
        bureauxVote: true
      }
    });

    if (!lieuVote) {
      throw new NotFoundException('Lieu de vote non trouvé ou non publié');
    }

    const zoneInfo: ZoneInfoDto = {
      type: ZoneType.VOTING_PLACE,
      id: lieuVote.id,
      name: lieuVote.libelleLieuVote,
      parentZone: {
        type: 'department',
        name: lieuVote.departement.libelleDepartement
      }
    };

    // Agrégation des statistiques des bureaux
    const statistics: ZoneStatisticsDto = {
      totalInscrits: lieuVote.bureauxVote.reduce((sum, bv) => sum + (bv.inscrits || 0), 0),
      totalVotants: lieuVote.bureauxVote.reduce((sum, bv) => sum + (bv.totalVotants || 0), 0),
      tauxParticipation: 0, // Calculé après
      totalExprimes: lieuVote.bureauxVote.reduce((sum, bv) => 
        sum + (bv.totalVotants || 0) - (bv.bulletinsNuls || 0) - (bv.bulletinsBlancs || 0), 0),
      totalBlancs: lieuVote.bureauxVote.reduce((sum, bv) => sum + (bv.bulletinsBlancs || 0), 0),
      totalNuls: lieuVote.bureauxVote.reduce((sum, bv) => sum + (bv.bulletinsNuls || 0), 0),
      nombreBureaux: lieuVote.bureauxVote.length,
      nombreLieuxVote: 1,
      nombreDepartements: 1
    };

    statistics.tauxParticipation = statistics.totalInscrits > 0 
      ? Number(((statistics.totalVotants / statistics.totalInscrits) * 100).toFixed(2))
      : 0;

    const results = await this.calculateCandidateResultsForZone([
      { type: 'votingPlace', id: lieuVote.id, name: lieuVote.libelleLieuVote }
    ]);

    return { zoneInfo, statistics, results };
  }

  /**
   * Récupérer les résultats d'un département (agrégation des lieux de vote)
   */
  private async getDepartmentResults(query: ResultsByZoneQueryDto): Promise<{
    zoneInfo: ZoneInfoDto;
    statistics: ZoneStatisticsDto;
    results: CandidateResultDto[];
  }> {
    // Gérer le cas où departmentId contient aussi l'ID de la commune (communes d'Abidjan)
    // Format: departmentId-communeId ou simplement departmentId
    let departmentId: string = '';
    let communeId: string | null = null;
    
    if (query.departmentId) {
      if (query.departmentId.includes('-')) {
        const parts = query.departmentId.split('-');
        // Le premier ID est le département, le deuxième est la commune
        departmentId = parts[0];
        communeId = parts[1];
      } else {
        departmentId = query.departmentId;
      }
    }
    
    // D'abord, vérifier si le département existe dans la base
    const departementCheck = await this.prisma.tblDept.findUnique({
      where: { id: departmentId },
      select: { id: true, libelleDepartement: true, statutPublication: true }
    });
    
    // Récupérer le département sans include pour éviter les 2100 paramètres
    const departement = await this.prisma.tblDept.findFirst({
      where: {
        id: departmentId,
        statutPublication: {
          in: ['PUBLIE', 'PUBLIÉ', 'PUBLISHED', 'ACTIF', 'ACTIVE', 'EN_COURS', 'EN COURS', 'IN_PROGRESS']
        }
      }
    });

    if (!departement) {
      console.log('❌ Département non trouvé ou non publié:', departmentId);
      console.log('❌ Statut du département dans la base:', departementCheck?.statutPublication);
      throw new NotFoundException('Département non trouvé ou non publié');
    }
    
    // Récupérer la région séparément
    const region = await this.prisma.tblReg.findUnique({
      where: { id: departement.codeRegion }
    });
    
    // Récupérer les statistiques des bureaux du département directement
    const bureauxStats = await this.prisma.tblBv.aggregate({
      where: {
        codeDepartement: departement.codeDepartement,
        ...(communeId ? {
          commune: { id: communeId }
        } : {})
      },
      _sum: {
        inscrits: true,
        totalVotants: true,
        bulletinsBlancs: true,
        bulletinsNuls: true
      },
      _count: {
        id: true
      }
    });
    
    const totalInscrits = bureauxStats._sum.inscrits || 0;
    const totalVotants = bureauxStats._sum.totalVotants || 0;
    const totalBlancs = bureauxStats._sum.bulletinsBlancs || 0;
    const totalNuls = bureauxStats._sum.bulletinsNuls || 0;
    const nombreBureaux = bureauxStats._count.id;
    
    // Compter les lieux de vote
    const nombreLieuxVote = await this.prisma.tblLv.count({
      where: {
        codeDepartement: departement.codeDepartement
      }
    });

    const zoneInfo: ZoneInfoDto = {
      type: ZoneType.DEPARTMENT,
      id: departement.id,
      name: departement.libelleDepartement,
      parentZone: {
        type: 'region',
        name: region?.libelleRegion || 'Région inconnue'
      }
    };

    const statistics: ZoneStatisticsDto = {
      totalInscrits,
      totalVotants,
      tauxParticipation: totalInscrits > 0 ? Number(((totalVotants / totalInscrits) * 100).toFixed(2)) : 0,
      totalExprimes: totalVotants - totalBlancs - totalNuls,
      totalBlancs,
      totalNuls,
      nombreBureaux,
      nombreLieuxVote,
      nombreDepartements: 1
    };

    // Passer le communeId si spécifié pour filtrer les résultats
    const zoneData = [
      { 
        type: 'department', 
        id: departement.id, 
        name: departement.libelleDepartement,
        communeId: communeId || undefined
      }
    ];
    
    const results = await this.calculateCandidateResultsForZone(zoneData);

    return { zoneInfo, statistics, results };
  }

  /**
   * Récupérer et agréger les résultats de plusieurs départements (communes d'Abidjan)
   */
  private async getMultipleDepartmentsResults(departmentIds: string[]): Promise<{
    zoneInfo: ZoneInfoDto;
    statistics: ZoneStatisticsDto;
    results: CandidateResultDto[];
  }> {
    // Récupérer tous les départements
    console.log('🔍 Recherche de plusieurs départements:', departmentIds);
    const departements = await this.prisma.tblDept.findMany({
      where: {
        id: { in: departmentIds },
        statutPublication: {
          in: ['PUBLIE', 'PUBLIÉ', 'PUBLISHED', 'ACTIF', 'ACTIVE', 'EN_COURS', 'EN COURS', 'IN_PROGRESS']
        }
      },
      include: {
        region: true,
        lieuxVote: {
          include: {
            bureauxVote: true
          }
        }
      }
    });

    if (departements.length === 0) {
      throw new NotFoundException('Aucun département trouvé ou publié');
    }

    // Utiliser le premier département pour les infos de base
    const firstDept = departements[0];
    const allDeptNames = departements.map(d => d.libelleDepartement).join(', ');

    const zoneInfo: ZoneInfoDto = {
      type: ZoneType.DEPARTMENT,
      id: firstDept.id,
      name: `Agrégation de ${departements.length} départements (${allDeptNames})`,
      parentZone: {
        type: 'region',
        name: firstDept.region.libelleRegion
      }
    };

    // Agrégation des statistiques de tous les départements
    let totalInscrits = 0, totalVotants = 0, totalBlancs = 0, totalNuls = 0;
    let nombreBureaux = 0;
    let nombreLieuxVote = 0;

    departements.forEach(dept => {
      dept.lieuxVote.forEach(lv => {
        nombreLieuxVote++;
        lv.bureauxVote.forEach(bv => {
          totalInscrits += bv.inscrits || 0;
          totalVotants += bv.totalVotants || 0;
          totalBlancs += bv.bulletinsBlancs || 0;
          totalNuls += bv.bulletinsNuls || 0;
          nombreBureaux++;
        });
      });
    });

    const statistics: ZoneStatisticsDto = {
      totalInscrits,
      totalVotants,
      tauxParticipation: totalInscrits > 0 ? Number(((totalVotants / totalInscrits) * 100).toFixed(2)) : 0,
      totalExprimes: totalVotants - totalBlancs - totalNuls,
      totalBlancs,
      totalNuls,
      nombreBureaux,
      nombreLieuxVote,
      nombreDepartements: departements.length
    };

    // Calculer les résultats par candidat pour tous les départements
    const zoneData = departements.map(dept => ({ 
      type: 'department', 
      id: dept.id, 
      name: dept.libelleDepartement 
    }));
    const results = await this.calculateCandidateResultsForZone(zoneData);

    return { zoneInfo, statistics, results };
  }

  /**
   * Récupérer les résultats d'une région (agrégation des départements)
   */
  private async getRegionResults(query: ResultsByZoneQueryDto): Promise<{
    zoneInfo: ZoneInfoDto;
    statistics: ZoneStatisticsDto;
    results: CandidateResultDto[];
  }> {
    // Récupérer la région sans include pour éviter les 2100 paramètres
    const region = await this.prisma.tblReg.findFirst({
      where: {
        id: query.regionId
      }
    });

    if (!region) {
      throw new NotFoundException('Région non trouvée');
    }

    // Récupérer les départements publiés de cette région
    const departements = await this.prisma.tblDept.findMany({
      where: {
        codeRegion: region.codeRegion,
        statutPublication: {
          in: ['PUBLIE', 'PUBLIÉ', 'PUBLISHED', 'ACTIF', 'ACTIVE', 'EN_COURS', 'EN COURS', 'IN_PROGRESS']
        }
      }
    });

    // Récupérer les statistiques des bureaux de la région directement
    const codesDepartements = departements.map(d => d.codeDepartement);
    
    const bureauxStats = await this.prisma.tblBv.aggregate({
      where: {
        codeDepartement: { in: codesDepartements }
      },
      _sum: {
        inscrits: true,
        totalVotants: true,
        bulletinsBlancs: true,
        bulletinsNuls: true
      },
      _count: {
        id: true
      }
    });
    
    const totalInscrits = bureauxStats._sum.inscrits || 0;
    const totalVotants = bureauxStats._sum.totalVotants || 0;
    const totalBlancs = bureauxStats._sum.bulletinsBlancs || 0;
    const totalNuls = bureauxStats._sum.bulletinsNuls || 0;
    const nombreBureaux = bureauxStats._count.id;
    
    // Compter les lieux de vote
    const nombreLieuxVote = await this.prisma.tblLv.count({
      where: {
        codeDepartement: { in: codesDepartements }
      }
    });

    const zoneInfo: ZoneInfoDto = {
      type: ZoneType.REGION,
      id: region.id,
      name: region.libelleRegion,
      parentZone: {
        type: 'country',
        name: 'Côte d\'Ivoire'
      }
    };

    const statistics: ZoneStatisticsDto = {
      totalInscrits,
      totalVotants,
      tauxParticipation: totalInscrits > 0 ? Number(((totalVotants / totalInscrits) * 100).toFixed(2)) : 0,
      totalExprimes: totalVotants - totalBlancs - totalNuls,
      totalBlancs,
      totalNuls,
      nombreBureaux,
      nombreLieuxVote,
      nombreDepartements: departements.length
    };

    const results = await this.calculateCandidateResultsForZone([
      { type: 'region', id: region.id, name: region.libelleRegion }
    ]);

    return { zoneInfo, statistics, results };
  }

  /**
   * Calculer les résultats des candidats pour une zone spécifique
   */
  private async calculateCandidateResultsForZone(zoneData: any[]): Promise<CandidateResultDto[]> {
    // Récupérer les candidats
    const candidats = await this.prisma.tblCandidat.findMany({
      include: {
        parrain: true
      },
      orderBy: {
        numeroOrdre: 'asc'
      }
    });

    // Calculer les résultats spécifiques à la zone
    const zoneResults = await this.calculateCandidateResultsForSpecificZone(zoneData);

    return candidats.map(candidat => {
      const candidateResult = zoneResults.find(r => r.candidateId === candidat.numeroOrdre.toString());
      const votes = candidateResult?.votes || 0;
      const percentage = candidateResult?.percentage || 0;

      return {
        candidateId: candidat.id,
        candidateName: `${candidat.prenomCandidat} ${candidat.nomCandidat}`,
        candidateNumber: parseInt(candidat.numeroOrdre),
        partyName: candidat.parrain?.libelleParrain || 'Indépendant',
        partyColor: this.getPartyColors(
          candidat.parrain?.codeParrain || 'independant',
          candidat.parrain?.couleur1,
          candidat.parrain?.couleur2,
          candidat.parrain?.couleur3
        )[0],
        votes,
        percentage,
        rank: this.calculateRank(zoneResults, votes),
        isWinner: this.isWinner(zoneResults, votes),
        isTied: this.isTied(zoneResults, votes)
      };
    });
  }

  /**
   * Calculer les résultats des candidats pour une zone spécifique
   */
  private async calculateCandidateResultsForSpecificZone(zoneData: any[]): Promise<ResultDto[]> {
    if (!zoneData || zoneData.length === 0) {
      // Si aucune donnée de zone spécifique, retourner les résultats globaux
      return await this.calculateCandidateResults();
    }

    // Construire les conditions de filtrage avec Prisma ORM
    let whereCondition: any = {
      departement: {
        OR: [
          { statutPublication: 'PUBLIE' },
          { statutPublication: 'PUBLIÉ' },
          { statutPublication: 'PUBLISHED' },
          { statutPublication: 'ACTIF' },
          { statutPublication: 'ACTIVE' },
          { statutPublication: 'EN_COURS' },
          { statutPublication: 'EN COURS' },
          { statutPublication: 'IN_PROGRESS' }
        ]
      }
    };

    // Déterminer le type de zone et construire la condition de filtrage
    
    if (zoneData.some(item => item.type === 'pollingStation')) {
      // Filtrage par bureau de vote spécifique
      const bureauIds = zoneData
        .filter(item => item.type === 'pollingStation')
        .map(item => item.id);
      
      whereCondition.id = { in: bureauIds };
    } else if (zoneData.some(item => item.type === 'votingPlace')) {
      // Filtrage par lieu de vote
      const lieuVoteIds = zoneData
        .filter(item => item.type === 'votingPlace')
        .map(item => item.id);
      
      whereCondition.lieuVote = { id: { in: lieuVoteIds } };
    } else if (zoneData.some(item => item.type === 'department')) {
      // Filtrage par département
      const deptIds = zoneData
        .filter(item => item.type === 'department')
        .map(item => item.id);
      
      const communeIds = zoneData
        .filter(item => item.type === 'department' && item.communeId)
        .map(item => item.communeId);
      
      whereCondition.departement = {
        id: { in: deptIds },
        OR: [
          { statutPublication: 'PUBLIE' },
          { statutPublication: 'PUBLIÉ' },
          { statutPublication: 'PUBLISHED' },
          { statutPublication: 'ACTIF' },
          { statutPublication: 'ACTIVE' },
          { statutPublication: 'EN_COURS' },
          { statutPublication: 'EN COURS' },
          { statutPublication: 'IN_PROGRESS' }
        ]
      };
      
      // Si une commune est spécifiée, filtrer aussi par commune
      if (communeIds.length > 0) {
        whereCondition.commune = {
          id: { in: communeIds }
        };
      }
    } else if (zoneData.some(item => item.type === 'region')) {
      // Filtrage par région
      const regionIds = zoneData
        .filter(item => item.type === 'region')
        .map(item => item.id);
      
      whereCondition.departement = {
        region: { id: { in: regionIds } },
        OR: [
          { statutPublication: 'PUBLIE' },
          { statutPublication: 'PUBLIÉ' },
          { statutPublication: 'PUBLISHED' },
          { statutPublication: 'ACTIF' },
          { statutPublication: 'ACTIVE' },
          { statutPublication: 'EN_COURS' },
          { statutPublication: 'EN COURS' },
          { statutPublication: 'IN_PROGRESS' }
        ]
      };
    }

    // Récupérer les bureaux de vote correspondants avec leurs relations
    const bureauxVote = await this.prisma.tblBv.findMany({
      where: whereCondition,
      include: {
        departement: {
          include: {
            region: true
          }
        },
        lieuVote: {
          include: {
            cellule: true
          }
        },
        commune: true
      }
    });

    console.log('📊 Nombre de bureaux de vote trouvés:', bureauxVote.length);

    if (bureauxVote.length === 0) {
      // Aucun bureau trouvé, retourner des résultats vides
      console.log('❌ Aucun bureau de vote trouvé avec les critères de filtrage');
      return [];
    }

    // Calculer les totaux pour chaque candidat
    // Pour chaque bureau, récupérer UNIQUEMENT l'enregistrement CEL correct
    let totalScore1 = 0, totalScore2 = 0, totalScore3 = 0, totalScore4 = 0, totalScore5 = 0;

    for (const bureau of bureauxVote) {
      const codeCellule = bureau.lieuVote?.cellule?.codeCellule;
      
      if (!codeCellule) {
        continue;
      }

      // Récupérer tous les enregistrements CEL pour ce code cellule et ce numéro de bureau
      const celRecords = await this.prisma.tblImportExcelCel.findMany({
        where: {
          codeCellule: codeCellule,
          numeroBureauVote: bureau.numeroBureauVote
        },
        orderBy: {
          dateImport: 'desc' // Plus récent en premier
        }
      });

      if (celRecords.length === 0) {
        continue;
      }

      // Sélectionner l'enregistrement le plus pertinent
      // Priorité 1 : Celui dont totalVotants correspond aux votants du bureau
      // Priorité 2 : Le plus récent avec statut COMPLETED
      let selectedRecord = celRecords.find(record => {
        const votantsRecord = parseInt(record.totalVotants || '0') || 0;
        return votantsRecord === (bureau.totalVotants || 0);
      });

      if (!selectedRecord) {
        // Si aucun ne correspond par totalVotants, prendre le plus récent avec statut COMPLETED
        selectedRecord = celRecords.find(r => r.statutImport === 'COMPLETED');
      }

      if (!selectedRecord) {
        // Si toujours rien, prendre le premier (plus récent)
        selectedRecord = celRecords[0];
      }

      // Ajouter les scores de cet enregistrement
      totalScore1 += parseInt(selectedRecord.score1 || '0') || 0;
      totalScore2 += parseInt(selectedRecord.score2 || '0') || 0;
      totalScore3 += parseInt(selectedRecord.score3 || '0') || 0;
      totalScore4 += parseInt(selectedRecord.score4 || '0') || 0;
      totalScore5 += parseInt(selectedRecord.score5 || '0') || 0;
    }

    const totalExprimes = totalScore1 + totalScore2 + totalScore3 + totalScore4 + totalScore5;
    const results: ResultDto[] = [];

    // Toujours retourner les 5 candidats, même avec 0 voix
    results.push({
      candidateId: '1',
      votes: totalScore1,
      percentage: totalExprimes > 0 
        ? Number(((totalScore1 / totalExprimes) * 100).toFixed(2))
        : 0
    });
    
    results.push({
      candidateId: '2',
      votes: totalScore2,
      percentage: totalExprimes > 0 
        ? Number(((totalScore2 / totalExprimes) * 100).toFixed(2))
        : 0
    });
    
    results.push({
      candidateId: '3',
      votes: totalScore3,
      percentage: totalExprimes > 0 
        ? Number(((totalScore3 / totalExprimes) * 100).toFixed(2))
        : 0
    });
    
    results.push({
      candidateId: '4',
      votes: totalScore4,
      percentage: totalExprimes > 0 
        ? Number(((totalScore4 / totalExprimes) * 100).toFixed(2))
        : 0
    });
    
    results.push({
      candidateId: '5',
      votes: totalScore5,
      percentage: totalExprimes > 0 
        ? Number(((totalScore5 / totalExprimes) * 100).toFixed(2))
        : 0
    });

    return results;
  }

  /**
   * Calculer le résumé des résultats
   */
  private calculateSummary(results: CandidateResultDto[]): SummaryDto {
    const totalCandidates = results.length;
    const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
    const averagePercentage = totalCandidates > 0 
      ? Number((results.reduce((sum, r) => sum + r.percentage, 0) / totalCandidates).toFixed(2))
      : 0;

    const winner = results.find(r => r.isWinner);

    return {
      totalCandidates,
      winner: winner ? {
        candidateId: winner.candidateId,
        candidateName: winner.candidateName,
        votes: winner.votes,
        percentage: winner.percentage
      } : {
        candidateId: '',
        candidateName: '',
        votes: 0,
        percentage: 0
      },
      totalVotes,
      averagePercentage
    };
  }

  // Méthodes existantes du service original (simplifiées pour éviter les erreurs)
  async getElectionHeader(electionId: string): Promise<ElectionHeaderResponseDto> {
    try {
      // Vérification du cache
      const cacheKey = `election_header:${electionId}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Calculer les totaux nationaux
      const totals = await this.calculateNationalTotals();
      
      // Récupérer les départements publiés
      const departementsPublies = await this.getPublishedDepartements();

      const headerData: ElectionHeaderDto = {
        id: electionId,
        nom: 'Élection Présidentielle 2025 - Premier Tour',
        date: '2025-10-25',
        type: 'presidential',
        tour: 1,
        status: 'preliminaires',
        lastUpdate: new Date().toISOString(),
        inscrits: totals.inscrits,
        inscritsHommes: totals.inscritsHommes,
        inscritsFemmes: totals.inscritsFemmes,
        votants: totals.votants,
        votantsHommes: totals.votantsHommes,
        votantsFemmes: totals.votantsFemmes,
        tauxParticipation: totals.tauxParticipation,
        suffrageExprime: totals.suffrageExprime,
        departementsPublies: departementsPublies
      };

      const result: ElectionHeaderResponseDto = {
        success: true,
        data: headerData,
        message: 'Données du header récupérées avec succès'
      };

      // Mise en cache (TTL de 2 minutes)
      this.cacheService.set(cacheKey, result, 120);

      return result;

    } catch (error) {
      console.error('Erreur lors de la récupération du header:', error);
      throw new NotFoundException('Erreur lors de la récupération du header');
    }
  }

  async getElectionResults(electionId: string, query: ElectionResultsQueryDto = {}): Promise<ElectionResultsResponseDto> {
    try {
      // Vérification du cache
      const cacheKey = `election_results:${electionId}:${JSON.stringify(query)}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Récupérer les départements publiés
      const departementsPublies = await this.getPublishedDepartements();
      
      // Récupérer les candidats
      const candidats = await this.prisma.tblCandidat.findMany({
        include: {
          parrain: true
        },
        orderBy: {
          numeroOrdre: 'asc'
        }
      });

      // Calculer les résultats des candidats (uniquement pour les départements publiés)
      const candidateResults = await this.calculateCandidateResults();
      const totalExprimes = await this.getTotalExprimes();

      // Construire les données des candidats avec leurs résultats
      const candidates: CandidateDto[] = candidats.map(candidat => {
        const candidateResult = candidateResults.find(r => r.candidateId === candidat.numeroOrdre.toString());
        const votes = candidateResult?.votes || 0;
        const percentage = candidateResult?.percentage || 0;

        return {
          id: candidat.id,
          firstName: candidat.prenomCandidat,
          lastName: candidat.nomCandidat,
          fullName: `${candidat.prenomCandidat} ${candidat.nomCandidat}`,
          numero: parseInt(candidat.numeroOrdre),
          photo: candidat.cheminPhoto || '/images/candidates/default.jpg',
          party: {
            id: candidat.parrain?.id || 'independant',
            name: candidat.parrain?.libelleParrain || 'Indépendant',
            sigle: candidat.parrain?.libelleParrain || 'IND',
            logo: candidat.cheminSymbole || '/images/parties/default.jpg',
            colors: this.getPartyColors(
              candidat.parrain?.codeParrain || 'independant',
              candidat.parrain?.couleur1,
              candidat.parrain?.couleur2,
              candidat.parrain?.couleur3
            ),
            primaryColor: this.getPartyColors(
              candidat.parrain?.codeParrain || 'independant',
              candidat.parrain?.couleur1,
              candidat.parrain?.couleur2,
              candidat.parrain?.couleur3
            )[0]
          },
          isWinner: false, // Sera calculé après tri
          isTied: false // Sera calculé après tri
        };
      });

      // Trier par nombre de voix et marquer le gagnant
      candidates.sort((a, b) => {
        const aResult = candidateResults.find(r => r.candidateId === a.numero.toString());
        const bResult = candidateResults.find(r => r.candidateId === b.numero.toString());
        const aVotes = aResult?.votes || 0;
        const bVotes = bResult?.votes || 0;
        return bVotes - aVotes;
      });
      
      if (candidates.length > 0) {
        candidates[0].isWinner = true;
        // Vérifier s'il y a égalité avec le deuxième
        if (candidates.length > 1) {
          const firstResult = candidateResults.find(r => r.candidateId === candidates[0].numero.toString());
          const secondResult = candidateResults.find(r => r.candidateId === candidates[1].numero.toString());
          const firstVotes = firstResult?.votes || 0;
          const secondVotes = secondResult?.votes || 0;
          if (firstVotes === secondVotes) {
            candidates[0].isTied = true;
            candidates[1].isTied = true;
          }
        }
      }

      // Calculer les totaux (uniquement pour les départements publiés)
      const totals = await this.calculateNationalTotals();

      // Calculer les statistiques
      const statistics = await this.calculateStatistics();

      // Récupérer les régions avec départements publiés
      const regions = await this.getRegionsWithPublishedDepartments();

      const result: ElectionResultsResponseDto = {
        success: true,
        data: {
          id: electionId,
          nom: 'Élection Présidentielle 2025 - Premier Tour',
          date: '2025-10-25T00:00:00Z',
          type: 'presidential',
          tour: 1,
          status: 'preliminaires',
          lastUpdate: new Date().toISOString(),
          candidates,
          totals,
          statistics,
          regions,
          departementsPublies
        },
        message: 'Résultats électoraux récupérés avec succès'
      };

      // Mettre en cache
      this.cacheService.set(cacheKey, result, 300); // 5 minutes

      return result;

    } catch (error) {
      console.error('Erreur lors de la récupération des résultats électoraux:', error);
      throw error;
    }
  }

  async getPublishedZones(electionId: string): Promise<PublishedZonesResponseDto> {
    try {
      // Vérification du cache
      const cacheKey = `published_zones:${electionId}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Pour éviter la limite de 2100 paramètres, on récupère d'abord les IDs des départements publiés
      const statusList = ['PUBLIE', 'PUBLIÉ', 'PUBLISHED', 'ACTIF', 'ACTIVE', 'EN_COURS', 'EN COURS', 'IN_PROGRESS'];
      
      // 1. D'abord, récupérer uniquement les IDs des départements publiés
      const departementsPublies = await this.prisma.tblDept.findMany({
        where: {
          statutPublication: {
            in: statusList
          }
        },
        select: {
          id: true
        }
      });
        
      const departementsIds = departementsPublies.map(dept => dept.id);
      
      console.log('📊 Nombre de départements publiés:', departementsIds.length);
      
      // 2. Récupérer TOUS les départements avec leurs relations (une seule requête)
      const departementsAvecRelations = await this.prisma.tblDept.findMany({
        where: {
          id: {
            in: departementsIds
          }
        },
        include: {
          region: true
        }
      });
      
      // 3. Récupérer TOUS les lieux de vote pour ces départements
      const lieuxVote = await this.prisma.tblLv.findMany({
        where: {
          departement: {
            id: {
              in: departementsIds
            }
          }
        }
      });
      
      // 4. Récupérer UNIQUEMENT les communes publiées (pour Abidjan)
      const communes = await this.prisma.tblCom.findMany({
        where: {
          statutPublication: {
            in: statusList
          }
        }
      });
      
      // 5. Récupérer les bureaux SANS include pour éviter les 2100 paramètres
      const bureauxDepartements = await this.prisma.tblBv.findMany({
        where: {
          departement: {
            id: {
              in: departementsIds
            }
          }
        }
      });
      
      console.log('📊 Nombre de bureaux trouvés:', bureauxDepartements.length);
      
      // 6. Créer des maps pour les relations
      // Pour le département : utiliser codeDepartement
      const departementsMap = new Map(departementsAvecRelations.map(d => [d.codeDepartement, d]));
      
      // Pour le lieu de vote : utiliser la clé composite complète (codeDepartement + codeSousPrefecture + codeCommune + codeLieuVote)
      const lieuxVoteMap = new Map(lieuxVote.map(lv => [`${lv.codeDepartement}-${lv.codeSousPrefecture}-${lv.codeCommune}-${lv.codeLieuVote}`, lv]));
      
      // Pour la commune : utiliser codeDepartement + codeSousPrefecture + codeCommune (clé composite)
      const communesMap = new Map(communes.map(c => [`${c.codeDepartement}-${c.codeSousPrefecture}-${c.codeCommune}`, c]));
      
      // 7. Enrichir manuellement les bureaux avec leurs relations
      const bureauxEnrichis = bureauxDepartements.map(bureau => ({
        ...bureau,
        departement: departementsMap.get(bureau.codeDepartement),
        lieuVote: lieuxVoteMap.get(`${bureau.codeDepartement}-${bureau.codeSousPrefecture}-${bureau.codeCommune}-${bureau.codeLieuVote}`),
        commune: bureau.codeCommune ? communesMap.get(`${bureau.codeDepartement}-${bureau.codeSousPrefecture}-${bureau.codeCommune}`) : null
      }));
      
      // 8. Trier les résultats
      bureauxEnrichis.sort((a, b) => {
        const regionCompare = a.departement?.region?.libelleRegion?.localeCompare(b.departement?.region?.libelleRegion || '') || 0;
        if (regionCompare !== 0) return regionCompare;
        
        const deptCompare = a.departement?.libelleDepartement?.localeCompare(b.departement?.libelleDepartement || '') || 0;
        if (deptCompare !== 0) return deptCompare;
        
        const lieuCompare = a.lieuVote?.libelleLieuVote?.localeCompare(b.lieuVote?.libelleLieuVote || '') || 0;
        if (lieuCompare !== 0) return lieuCompare;
        
        return a.numeroBureauVote?.localeCompare(b.numeroBureauVote || '') || 0;
      });

      // 2. COMMENTÉ: Récupérer les bureaux des communes publiées (pour Abidjan notamment)
      // On utilise maintenant uniquement le statut de publication du département Abidjan
      // const bureauxCommunes = await this.prisma.tblBv.findMany({
      //   where: {
      //     commune: {
      //       statutPublication: {
      //         in: statusList
      //       }
      //     }
      //   },
      //   include: {
      //     departement: {
      //       include: {
      //         region: true
      //       }
      //     },
      //     commune: true,
      //     lieuVote: true
      //   },
      //   orderBy: [
      //     { departement: { region: { libelleRegion: 'asc' } } },
      //     { departement: { libelleDepartement: 'asc' } },
      //     { commune: { libelleCommune: 'asc' } },
      //     { lieuVote: { libelleLieuVote: 'asc' } },
      //     { numeroBureauVote: 'asc' }
      //   ]
      // });

      // 9. Filtrer les bureaux : pour Abidjan, n'inclure que les bureaux des communes publiées
      const bureauxPublies = bureauxEnrichis.filter(bureau => {
        const isAbidjan = bureau.departement?.libelleDepartement?.toUpperCase() === 'ABIDJAN';
        
        // Si c'est Abidjan et qu'on a une commune, vérifier qu'elle est publiée
        if (isAbidjan && bureau.commune) {
          return communesMap.has(`${bureau.codeDepartement}-${bureau.codeSousPrefecture}-${bureau.codeCommune}`);
        }
        
        // Pour les autres départements ou si pas de commune, inclure le bureau
        return true;
      });

      // Construire la structure hiérarchique
      const regionsMap = new Map<string, PublishedRegionDto>();

      bureauxPublies.forEach(bureau => {
        // Ignorer les bureaux sans département ou lieu de vote
        if (!bureau.departement || !bureau.lieuVote) {
          console.warn('⚠️ Bureau sans département ou lieu de vote:', bureau.id);
          return;
        }
        
        const region = bureau.departement.region;
        const departement = bureau.departement;
        const commune = bureau.commune;
        const lieuVote = bureau.lieuVote;

        // Créer ou récupérer la région
        if (!regionsMap.has(region.id)) {
          regionsMap.set(region.id, {
            id: region.id,
            name: region.libelleRegion,
            departments: []
          });
        }

        const regionData = regionsMap.get(region.id)!;

        // Pour Abidjan, utiliser le nom de la commune au lieu du département
        // Pour les autres départements, utiliser le nom du département
        const isAbidjan = departement.libelleDepartement.toUpperCase() === 'ABIDJAN';
        const departmentName = isAbidjan && commune 
          ? `${departement.libelleDepartement} - ${commune.libelleCommune}`
          : departement.libelleDepartement;
        
        const departmentId = isAbidjan && commune 
          ? `${departement.id}-${commune.id}`
          : departement.id;

        // Créer ou récupérer le département (ou commune pour Abidjan)
        let departmentData = regionData.departments.find(d => d.id === departmentId);
        if (!departmentData) {
          departmentData = {
            id: departmentId,
            name: departmentName,
            votingPlaces: []
          };
          regionData.departments.push(departmentData);
        }

        // Créer ou récupérer le lieu de vote
        let votingPlaceData = departmentData.votingPlaces.find(vp => vp.id === lieuVote.id);
        if (!votingPlaceData) {
          votingPlaceData = {
            id: lieuVote.id,
            name: lieuVote.libelleLieuVote,
            pollingStations: []
          };
          departmentData.votingPlaces.push(votingPlaceData);
        }

        // Ajouter le bureau de vote
        votingPlaceData.pollingStations.push({
          id: bureau.id,
          name: `Bureau ${bureau.numeroBureauVote}`
        });
      });

      // Trier les données
      const regions = Array.from(regionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      regions.forEach(region => {
        region.departments.sort((a, b) => a.name.localeCompare(b.name));
        region.departments.forEach(dept => {
          dept.votingPlaces.sort((a, b) => a.name.localeCompare(b.name));
          dept.votingPlaces.forEach(vp => {
            vp.pollingStations.sort((a, b) => a.name.localeCompare(b.name));
          });
        });
      });

      const result: PublishedZonesResponseDto = {
        success: true,
        data: {
          electionId: electionId,
          electionName: 'Élection Présidentielle 2025 - Premier Tour',
          regions: regions
        },
        message: 'Zones avec résultats publiés récupérées avec succès',
        timestamp: new Date().toISOString()
      };

      // Mise en cache (TTL de 5 minutes)
      this.cacheService.set(cacheKey, result, 300);

      return result;

    } catch (error) {
      console.error('Erreur lors de la récupération des zones publiées:', error);
      throw new NotFoundException('Erreur lors de la récupération des zones publiées');
    }
  }

  async getCandidatesDetailed(electionId: string): Promise<any> {
    try {
      // Vérification du cache
      const cacheKey = `candidates_detailed:${electionId}`;
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Récupérer les candidats avec leurs parrains
      const candidats = await this.prisma.tblCandidat.findMany({
        include: {
          parrain: true
        },
        orderBy: {
          numeroOrdre: 'asc'
        }
      });

      // Calculer les résultats des candidats
      const candidateResults = await this.calculateCandidateResults();
      const totalExprimes = await this.getTotalExprimes();

      // Construire la réponse avec les candidats et leurs résultats
      const candidatesWithResults = candidats.map(candidat => {
        const candidateResult = candidateResults.find(r => r.candidateId === candidat.numeroOrdre.toString());
        const votes = candidateResult?.votes || 0;
        const percentage = candidateResult?.percentage || 0;

        return {
          id: candidat.id,
          firstName: candidat.prenomCandidat,
          lastName: candidat.nomCandidat,
          fullName: `${candidat.prenomCandidat} ${candidat.nomCandidat}`,
          numero: parseInt(candidat.numeroOrdre),
          photo: candidat.cheminPhoto || '/images/candidates/default.jpg',
          party: {
            id: candidat.parrain?.id || 'independant',
            name: candidat.parrain?.libelleParrain || 'Indépendant',
            sigle: candidat.parrain?.libelleParrain || 'IND',
            logo: candidat.cheminSymbole || '/images/parties/default.jpg',
            colors: this.getPartyColors(
              candidat.parrain?.codeParrain || 'independant',
              candidat.parrain?.couleur1,
              candidat.parrain?.couleur2,
              candidat.parrain?.couleur3
            ),
            primaryColor: this.getPartyColors(
              candidat.parrain?.codeParrain || 'independant',
              candidat.parrain?.couleur1,
              candidat.parrain?.couleur2,
              candidat.parrain?.couleur3
            )[0],
            color: this.getPartyColors(
              candidat.parrain?.codeParrain || 'independant',
              candidat.parrain?.couleur1,
              candidat.parrain?.couleur2,
              candidat.parrain?.couleur3
            )[0]
          },
          votes: votes,
          percentage: percentage,
          rank: this.calculateRank(candidateResults, votes),
          isWinner: this.isWinner(candidateResults, votes),
          isTied: this.isTied(candidateResults, votes),
          trend: this.calculateTrend(candidateResults, votes)
        };
      });

      // Calculer le résumé
      const winner = candidatesWithResults.find(c => c.isWinner);
      const totalVotes = candidatesWithResults.reduce((sum, c) => sum + c.votes, 0);
      const averagePercentage = candidatesWithResults.length > 0 
        ? Number((candidatesWithResults.reduce((sum, c) => sum + c.percentage, 0) / candidatesWithResults.length).toFixed(2))
        : 0;

      const result = {
        success: true,
        data: {
          electionId: electionId,
          electionName: 'Élection Présidentielle 2025 - Premier Tour',
          totalCandidates: candidats.length,
          totalExprimes: totalExprimes,
          candidates: candidatesWithResults,
          summary: {
            winner: winner ? {
              candidateId: winner.id,
              candidateName: winner.fullName,
              votes: winner.votes,
              percentage: winner.percentage
            } : null,
            totalVotes: totalVotes,
            averagePercentage: averagePercentage
          }
        },
        message: 'Informations complètes des candidats récupérées avec succès',
        timestamp: new Date().toISOString()
      };

      // Mise en cache (TTL de 0 minutes pour debug)
      this.cacheService.set(cacheKey, result, 0);

      return result;

    } catch (error) {
      console.error('Erreur lors de la récupération des candidats détaillés:', error);
      throw new NotFoundException('Erreur lors de la récupération des candidats détaillés');
    }
  }

  // Méthodes utilitaires
  private async calculateCandidateResults(): Promise<ResultDto[]> {
    // Récupérer les données des CELs des départements publiés uniquement
    const allData = await this.prisma.$queryRaw<Array<{
      SCORE_1: string | null;
      SCORE_2: string | null;
      SCORE_3: string | null;
      SCORE_4: string | null;
      SCORE_5: string | null;
    }>>`
      SELECT 
        iec.SCORE_1,
        iec.SCORE_2,
        iec.SCORE_3,
        iec.SCORE_4,
        iec.SCORE_5
      FROM TBL_IMPORT_EXCEL_CEL iec
      WHERE EXISTS (
        SELECT 1 
        FROM TBL_CEL c
        INNER JOIN TBL_LV lv ON lv.COD_CEL = c.COD_CEL
        INNER JOIN TBL_DEPT d ON d.COD_DEPT = lv.COD_DEPT
        WHERE c.COD_CEL = iec.COD_CEL
          AND d.STAT_PUB IN ('PUBLIE', 'PUBLIÉ', 'PUBLISHED', 'ACTIF', 'ACTIVE', 'EN_COURS', 'EN COURS', 'IN_PROGRESS')
      )
    `;

    const totalExprimes = await this.getTotalExprimes();

    let totalScore1 = 0, totalScore2 = 0, totalScore3 = 0, totalScore4 = 0, totalScore5 = 0;

    allData.forEach(record => {
      totalScore1 += parseInt(record.SCORE_1 || '0') || 0;
      totalScore2 += parseInt(record.SCORE_2 || '0') || 0;
      totalScore3 += parseInt(record.SCORE_3 || '0') || 0;
      totalScore4 += parseInt(record.SCORE_4 || '0') || 0;
      totalScore5 += parseInt(record.SCORE_5 || '0') || 0;
    });

    const results: ResultDto[] = [];
    
    if (totalScore1 > 0) {
      results.push({
        candidateId: '1',
        votes: totalScore1,
        percentage: totalExprimes > 0 
          ? Number(((totalScore1 / totalExprimes) * 100).toFixed(2))
          : 0
      });
    }
    
    if (totalScore2 > 0) {
      results.push({
        candidateId: '2',
        votes: totalScore2,
        percentage: totalExprimes > 0 
          ? Number(((totalScore2 / totalExprimes) * 100).toFixed(2))
          : 0
      });
    }
    
    if (totalScore3 > 0) {
      results.push({
        candidateId: '3',
        votes: totalScore3,
        percentage: totalExprimes > 0 
          ? Number(((totalScore3 / totalExprimes) * 100).toFixed(2))
          : 0
      });
    }
    
    if (totalScore4 > 0) {
      results.push({
        candidateId: '4',
        votes: totalScore4,
        percentage: totalExprimes > 0 
          ? Number(((totalScore4 / totalExprimes) * 100).toFixed(2))
          : 0
      });
    }
    
    if (totalScore5 > 0) {
      results.push({
        candidateId: '5',
        votes: totalScore5,
        percentage: totalExprimes > 0 
          ? Number(((totalScore5 / totalExprimes) * 100).toFixed(2))
          : 0
      });
    }

    return results;
  }

  private async getTotalExprimes(): Promise<number> {
    // Récupérer les données des CELs des départements publiés uniquement
    const allData = await this.prisma.$queryRaw<Array<{
      SCORE_1: string | null;
      SCORE_2: string | null;
      SCORE_3: string | null;
      SCORE_4: string | null;
      SCORE_5: string | null;
    }>>`
      SELECT 
        iec.SCORE_1,
        iec.SCORE_2,
        iec.SCORE_3,
        iec.SCORE_4,
        iec.SCORE_5
      FROM TBL_IMPORT_EXCEL_CEL iec
      WHERE EXISTS (
        SELECT 1 
        FROM TBL_CEL c
        INNER JOIN TBL_LV lv ON lv.COD_CEL = c.COD_CEL
        INNER JOIN TBL_DEPT d ON d.COD_DEPT = lv.COD_DEPT
        WHERE c.COD_CEL = iec.COD_CEL
          AND d.STAT_PUB IN ('PUBLIE', 'PUBLIÉ', 'PUBLISHED', 'ACTIF', 'ACTIVE', 'EN_COURS', 'EN COURS', 'IN_PROGRESS')
      )
    `;

    let total = 0;
    allData.forEach(record => {
      total += parseInt(record.SCORE_1 || '0') || 0;
      total += parseInt(record.SCORE_2 || '0') || 0;
      total += parseInt(record.SCORE_3 || '0') || 0;
      total += parseInt(record.SCORE_4 || '0') || 0;
      total += parseInt(record.SCORE_5 || '0') || 0;
    });

    return total;
  }

  private getPartyColors(partyCode: string, parrainCouleur1?: string | null, parrainCouleur2?: string | null, parrainCouleur3?: string | null): string[] {
    const couleurs: string[] = [];
    
    if (parrainCouleur1 && parrainCouleur1.trim() !== '') {
      couleurs.push(parrainCouleur1);
    }
    if (parrainCouleur2 && parrainCouleur2.trim() !== '') {
      couleurs.push(parrainCouleur2);
    }
    if (parrainCouleur3 && parrainCouleur3.trim() !== '') {
      couleurs.push(parrainCouleur3);
    }
    
    if (couleurs.length === 0) {
      const colors: { [key: string]: string[] } = {
        'rhdp': ['#40FF00', '#FF8000'],
        'fpi': ['#D32500', '#F2B51F', '#0026BD'],
        'pdci': ['#059669'],
        'udci': ['#DC2626'],
        'independant': ['#6B7280']
      };
      
      return colors[partyCode.toLowerCase()] || ['#6B7280'];
    }
    
    return couleurs;
  }

  private calculateRank(results: any[], votes: number): number {
    const sortedResults = [...results].sort((a, b) => b.votes - a.votes);
    return sortedResults.findIndex(r => r.votes === votes) + 1;
  }

  private isWinner(results: any[], votes: number): boolean {
    const maxVotes = Math.max(...results.map(r => r.votes));
    return votes === maxVotes && votes > 0;
  }

  private isTied(results: any[], votes: number): boolean {
    const maxVotes = Math.max(...results.map(r => r.votes));
    const winnersCount = results.filter(r => r.votes === maxVotes && r.votes > 0).length;
    return winnersCount > 1 && votes === maxVotes;
  }

  private calculateTrend(results: any[], votes: number): string {
    // Pour l'instant, retourner une tendance neutre
    // Cette méthode pourrait être étendue pour calculer les tendances basées sur les données historiques
    return 'stable';
  }

  private async calculateNationalTotals(): Promise<any> {
    // 1. Agrégation des inscrits (TOUS les inscrits, sans filtre)
    const inscritsTotals = await this.prisma.tblBv.aggregate({
      _sum: {
        inscrits: true,
        populationHommes: true,
        populationFemmes: true
      }
    });

    // 2. Agrégation des résultats électoraux (départements publiés uniquement)
    const resultsTotals = await this.prisma.tblBv.aggregate({
      where: {
        departement: {
          OR: [
            { statutPublication: 'PUBLIE' },
            { statutPublication: 'PUBLIÉ' },
            { statutPublication: 'PUBLISHED' },
            { statutPublication: 'ACTIF' },
            { statutPublication: 'ACTIVE' },
            { statutPublication: 'EN_COURS' },
            { statutPublication: 'EN COURS' },
            { statutPublication: 'IN_PROGRESS' }
          ]
        }
      },
      _sum: {
        totalVotants: true,
        votantsHommes: true,
        votantsFemmes: true,
        bulletinsBlancs: true,
        bulletinsNuls: true
      }
    });

    // Utiliser les totaux appropriés
    const inscrits = inscritsTotals._sum.inscrits || 0;
    const inscritsHommes = inscritsTotals._sum.populationHommes || 0;
    const inscritsFemmes = inscritsTotals._sum.populationFemmes || 0;
    const votants = resultsTotals._sum.totalVotants || 0;
    const votantsHommes = resultsTotals._sum.votantsHommes || 0;
    const votantsFemmes = resultsTotals._sum.votantsFemmes || 0;
    const bulletinsBlancs = resultsTotals._sum.bulletinsBlancs || 0;
    const bulletinsNuls = resultsTotals._sum.bulletinsNuls || 0;

    const suffrageExprime = votants - bulletinsBlancs - bulletinsNuls;
    const tauxParticipation = inscrits > 0 ? Number(((votants / inscrits) * 100).toFixed(2)) : 0;

    return {
      inscrits,
      inscritsHommes,
      inscritsFemmes,
      votants,
      votantsHommes,
      votantsFemmes,
      suffrageExprime: suffrageExprime,
      bulletinsBlancs: bulletinsBlancs,
      bulletinsNuls: bulletinsNuls,
      tauxParticipation,
      results: [] // Les résultats par candidat peuvent être ajoutés si nécessaire
    };
  }

  private async getPublishedDepartements(): Promise<string[]> {
    // Récupérer les départements publiés
    const departementsPublies = await this.prisma.tblDept.findMany({
      where: {
        OR: [
          { statutPublication: 'PUBLIE' },
          { statutPublication: 'PUBLIÉ' },
          { statutPublication: 'PUBLISHED' },
          { statutPublication: 'ACTIF' },
          { statutPublication: 'ACTIVE' },
          { statutPublication: 'EN_COURS' },
          { statutPublication: 'EN COURS' },
          { statutPublication: 'IN_PROGRESS' }
        ]
      },
      select: {
        libelleDepartement: true
      }
    });

    // Récupérer les communes d'Abidjan publiées
    const communesAbidjanPubliees = await this.prisma.tblCom.findMany({
      where: {
        OR: [
          { statutPublication: 'PUBLIE' },
          { statutPublication: 'PUBLIÉ' },
          { statutPublication: 'PUBLISHED' },
          { statutPublication: 'ACTIF' },
          { statutPublication: 'ACTIVE' },
          { statutPublication: 'EN_COURS' },
          { statutPublication: 'EN COURS' },
          { statutPublication: 'IN_PROGRESS' }
        ]
      },
      select: {
        libelleCommune: true
      }
    });

    // Combiner les départements et communes publiés
    const departementsList = departementsPublies.map(dept => dept.libelleDepartement);
    const communesList = communesAbidjanPubliees.map(commune => commune.libelleCommune);

    return [...departementsList, ...communesList];
  }

  /**
   * Calculer les statistiques générales (uniquement pour les départements publiés)
   */
  private async calculateStatistics(): Promise<StatisticsDto> {
    // Récupérer le nombre total de bureaux de vote
    const totalBureaux = await this.prisma.tblBv.count({
      where: {
        departement: {
          OR: [
            { statutPublication: 'PUBLIE' },
            { statutPublication: 'PUBLIÉ' },
            { statutPublication: 'PUBLISHED' },
            { statutPublication: 'ACTIF' },
            { statutPublication: 'ACTIVE' },
            { statutPublication: 'EN_COURS' },
            { statutPublication: 'EN COURS' },
            { statutPublication: 'IN_PROGRESS' }
          ]
        }
      }
    });

    // Récupérer le nombre de bureaux traités (avec résultats)
    const bureauxTraites = await this.prisma.tblBv.count({
      where: {
        departement: {
          OR: [
            { statutPublication: 'PUBLIE' },
            { statutPublication: 'PUBLIÉ' },
            { statutPublication: 'PUBLISHED' },
            { statutPublication: 'ACTIF' },
            { statutPublication: 'ACTIVE' },
            { statutPublication: 'EN_COURS' },
            { statutPublication: 'EN COURS' },
            { statutPublication: 'IN_PROGRESS' }
          ]
        },
        totalVotants: {
          gt: 0
        }
      }
    });

    const pourcentageTraite = totalBureaux > 0 
      ? Number(((bureauxTraites / totalBureaux) * 100).toFixed(2))
      : 0;

    return {
      bureauTraites: bureauxTraites,
      bureauTotal: totalBureaux,
      pourcentageTraite,
      tendances: [] // Les tendances peuvent être calculées séparément si nécessaire
    };
  }

  /**
   * Récupérer les régions avec leurs départements publiés
   */
  private async getRegionsWithPublishedDepartments(): Promise<RegionDto[]> {
    const regions = await this.prisma.tblReg.findMany({
      include: {
        departements: {
          where: {
            OR: [
              { statutPublication: 'PUBLIE' },
              { statutPublication: 'PUBLIÉ' },
              { statutPublication: 'PUBLISHED' },
              { statutPublication: 'ACTIF' },
              { statutPublication: 'ACTIVE' },
              { statutPublication: 'EN_COURS' },
              { statutPublication: 'EN COURS' },
              { statutPublication: 'IN_PROGRESS' }
            ]
          },
          include: {
            lieuxVote: {
              include: {
                bureauxVote: true
              }
            }
          },
          orderBy: {
            libelleDepartement: 'asc'
          }
        }
      },
      orderBy: {
        libelleRegion: 'asc'
      }
    });

    return regions.map(region => {
      // Calculer les totaux de la région
      let totalInscrits = 0, totalVotants = 0, totalBlancs = 0, totalNuls = 0;
      
      region.departements.forEach(dept => {
        dept.lieuxVote.forEach(lv => {
          lv.bureauxVote.forEach(bv => {
            totalInscrits += bv.inscrits || 0;
            totalVotants += bv.totalVotants || 0;
            totalBlancs += bv.bulletinsBlancs || 0;
            totalNuls += bv.bulletinsNuls || 0;
          });
        });
      });

      const suffrageExprime = totalVotants - totalBlancs - totalNuls;
      const tauxParticipation = totalInscrits > 0 ? Number(((totalVotants / totalInscrits) * 100).toFixed(2)) : 0;

      return {
        id: region.id,
        nom: region.libelleRegion,
        departements: region.departements.map(dept => {
          // Calculer les totaux du département
          let deptInscrits = 0, deptVotants = 0, deptBlancs = 0, deptNuls = 0;
          
          dept.lieuxVote.forEach(lv => {
            lv.bureauxVote.forEach(bv => {
              deptInscrits += bv.inscrits || 0;
              deptVotants += bv.totalVotants || 0;
              deptBlancs += bv.bulletinsBlancs || 0;
              deptNuls += bv.bulletinsNuls || 0;
            });
          });

          const deptSuffrageExprime = deptVotants - deptBlancs - deptNuls;
          const deptTauxParticipation = deptInscrits > 0 ? Number(((deptVotants / deptInscrits) * 100).toFixed(2)) : 0;

          return {
            id: dept.id,
            code: dept.id, // Utiliser l'ID comme code
            nom: dept.libelleDepartement,
            regionId: region.id,
            totals: {
              inscrits: deptInscrits,
              inscritsHommes: 0, // Non disponible dans le schéma actuel
              inscritsFemmes: 0, // Non disponible dans le schéma actuel
              votants: deptVotants,
              votantsHommes: 0, // Non disponible dans le schéma actuel
              votantsFemmes: 0, // Non disponible dans le schéma actuel
              exprimes: deptSuffrageExprime,
              blancs: deptBlancs,
              nuls: deptNuls,
              tauxParticipation: deptTauxParticipation,
              results: [] // Les résultats par candidat peuvent être ajoutés si nécessaire
            },
            lieuxVote: dept.lieuxVote.map(lv => {
              // Calculer les totaux du lieu de vote
              let lvInscrits = 0, lvVotants = 0, lvBlancs = 0, lvNuls = 0;
              
              lv.bureauxVote.forEach(bv => {
                lvInscrits += bv.inscrits || 0;
                lvVotants += bv.totalVotants || 0;
                lvBlancs += bv.bulletinsBlancs || 0;
                lvNuls += bv.bulletinsNuls || 0;
              });

              const lvSuffrageExprime = lvVotants - lvBlancs - lvNuls;
              const lvTauxParticipation = lvInscrits > 0 ? Number(((lvVotants / lvInscrits) * 100).toFixed(2)) : 0;

              return {
                id: lv.id,
                nom: lv.libelleLieuVote,
                adresse: '', // Non disponible dans le schéma actuel
                departementId: dept.id,
                totals: {
                  inscrits: lvInscrits,
                  inscritsHommes: 0,
                  inscritsFemmes: 0,
                  votants: lvVotants,
                  votantsHommes: 0,
                  votantsFemmes: 0,
                  exprimes: lvSuffrageExprime,
                  blancs: lvBlancs,
                  nuls: lvNuls,
                  tauxParticipation: lvTauxParticipation,
                  results: []
                },
                bureaux: lv.bureauxVote.map(bv => ({
                  id: bv.id,
                  numero: bv.numeroBureauVote,
                  nom: bv.numeroBureauVote, // Utiliser le numéro comme nom
                  lieuVoteId: lv.id,
                  inscrits: bv.inscrits || 0,
                  inscritsHommes: 0,
                  inscritsFemmes: 0,
                  votants: bv.totalVotants || 0,
                  votantsHommes: 0,
                  votantsFemmes: 0,
                  exprimes: (bv.totalVotants || 0) - (bv.bulletinsBlancs || 0) - (bv.bulletinsNuls || 0),
                  blancs: bv.bulletinsBlancs || 0,
                  nuls: bv.bulletinsNuls || 0,
                  tauxParticipation: (bv.inscrits || 0) > 0 ? Number((((bv.totalVotants || 0) / (bv.inscrits || 1)) * 100).toFixed(2)) : 0,
                  results: []
                }))
              };
            })
          };
        }),
        totals: {
          inscrits: totalInscrits,
          inscritsHommes: 0,
          inscritsFemmes: 0,
          votants: totalVotants,
          votantsHommes: 0,
          votantsFemmes: 0,
          exprimes: suffrageExprime,
          blancs: totalBlancs,
          nuls: totalNuls,
          tauxParticipation,
          results: []
        }
      };
    });
  }
}
