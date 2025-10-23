import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
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

@Injectable()
export class ResultatsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService
  ) {}

  /**
   * Récupérer les données du header des résultats électoraux (approche simplifiée)
   */
  async getElectionHeader(electionId: string): Promise<ElectionHeaderResponseDto> {
    try {
      // Validation de l'electionId
      if (!electionId || electionId.trim() === '') {
        throw new BadRequestException('L\'identifiant de l\'élection est requis');
      }

      // Génération de la clé de cache pour le header
      const cacheKey = `election_header:${electionId}`;
      
      // Vérification du cache
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Récupération des totaux nationaux (données minimales)
      const nationalTotals = await this.calculateNationalTotals();
      
      // Récupération des départements publiés
      const departementsPublies = await this.getPublishedDepartements();

      const headerData: ElectionHeaderDto = {
        id: electionId,
        nom: 'Élection Présidentielle 2025 - Premier Tour',
        date: '2025-10-25',
        type: 'presidential',
        tour: 1,
        status: 'preliminaires',
        lastUpdate: new Date().toISOString(),
        
        inscrits: nationalTotals.inscrits,
        inscritsHommes: nationalTotals.inscritsHommes,
        inscritsFemmes: nationalTotals.inscritsFemmes,
        votants: nationalTotals.votants,
        votantsHommes: nationalTotals.votantsHommes,
        votantsFemmes: nationalTotals.votantsFemmes,
        tauxParticipation: nationalTotals.tauxParticipation,
        suffrageExprime: nationalTotals.exprimes,
        
        departementsPublies
      };

      const result: ElectionHeaderResponseDto = {
        success: true,
        data: headerData,
        message: 'Données du header récupérées avec succès'
      };

      // Mise en cache du résultat (TTL de 2 minutes pour le header)
      this.cacheService.set(cacheKey, result, 120);

      return result;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(`Élection avec l'ID ${electionId} non trouvée`);
    }
  }

  /**
   * Récupérer les données complètes des résultats électoraux
   */
  async getElectionResults(
    electionId: string,
    query: ElectionResultsQueryDto = {}
  ): Promise<ElectionResultsResponseDto> {
    try {
      // Validation de l'electionId
      if (!electionId || electionId.trim() === '') {
        throw new BadRequestException('L\'identifiant de l\'élection est requis');
      }

      // Génération de la clé de cache
      const cacheKey = this.generateCacheKey(electionId, query);
      
      // Vérification du cache
      const cachedResult = this.cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Récupération des candidats
      const candidates = await this.getCandidates();
      
      // Récupération des données selon le niveau demandé
      let electionData: ElectionResultsDto;
      
      switch (query.level) {
        case 'national':
          electionData = await this.getNationalResults(electionId, candidates, query);
          break;
        case 'regional':
          electionData = await this.getRegionalResults(electionId, candidates, query);
          break;
        case 'departemental':
          electionData = await this.getDepartementalResults(electionId, candidates, query);
          break;
        case 'bureau':
          electionData = await this.getBureauResults(electionId, candidates, query);
          break;
        default:
          electionData = await this.getNationalResults(electionId, candidates, query);
      }

      const result = {
        success: true,
        data: electionData,
        message: 'Résultats électoraux récupérés avec succès'
      };

      // Mise en cache du résultat (TTL de 5 minutes pour les résultats complets)
      this.cacheService.set(cacheKey, result, 300);

      return result;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(`Élection avec l'ID ${electionId} non trouvée`);
    }
  }

  /**
   * Générer une clé de cache unique
   */
  private generateCacheKey(electionId: string, query: ElectionResultsQueryDto): string {
    const queryString = JSON.stringify(query);
    return `election_results:${electionId}:${Buffer.from(queryString).toString('base64')}`;
  }

  /**
   * Récupérer la liste des candidats
   */
  private async getCandidates(): Promise<CandidateDto[]> {
    // Vérification du cache pour les candidats
    const cacheKey = 'candidates_list';
    const cachedCandidates = this.cacheService.get(cacheKey);
    if (cachedCandidates) {
      return cachedCandidates;
    }
    const candidats = await this.prisma.tblCandidat.findMany({
      include: {
        parrain: true
      },
      orderBy: {
        numeroOrdre: 'asc'
      }
    });

    const candidates = candidats.map(candidat => ({
      id: candidat.id,
      firstName: candidat.prenomCandidat,
      lastName: candidat.nomCandidat,
      fullName: `${candidat.prenomCandidat} ${candidat.nomCandidat}`,
      numero: parseInt(candidat.numeroOrdre),
      photo: candidat.cheminPhoto || '/images/candidates/default.jpg',
      party: {
        id: candidat.parrain?.codeParrain || 'independant',
        name: candidat.parrain?.libelleParrain || 'Indépendant',
        sigle: candidat.parrain?.sigle || 'IND',
        logo: candidat.cheminSymbole || '/images/parties/default.jpg',
        color: this.getPartyColor(candidat.parrain?.codeParrain || 'independant')
      },
      isWinner: false, // Sera calculé plus tard
      isTied: false
    }));

    // Mise en cache des candidats (TTL de 1 heure)
    this.cacheService.set(cacheKey, candidates, 3600);

    return candidates;
  }

  /**
   * Récupérer les résultats au niveau national
   */
  private async getNationalResults(
    electionId: string,
    candidates: CandidateDto[],
    query: ElectionResultsQueryDto
  ): Promise<ElectionResultsDto> {
    // Récupération des totaux nationaux
    const nationalTotals = await this.calculateNationalTotals();
    
    // Récupération des régions
    const regions = await this.getRegionsWithResults(query);

    // Calcul des statistiques
    const statistics = query.includeStatistics !== false 
      ? await this.calculateStatistics() 
      : this.getDefaultStatistics();

    // Détermination du gagnant
    const winnerCandidate = this.determineWinner(nationalTotals.results);
    candidates.forEach(candidate => {
      candidate.isWinner = candidate.id === winnerCandidate?.candidateId;
    });

    return {
      id: electionId,
      nom: 'Élection Présidentielle 2025 - Premier Tour',
      date: '2025-10-25T00:00:00Z',
      type: 'presidential',
      tour: 1,
      status: 'preliminaires',
      lastUpdate: new Date().toISOString(),
      candidates,
      totals: nationalTotals,
      statistics,
      regions,
      departementsPublies: await this.getPublishedDepartements()
    };
  }

  /**
   * Calculer les totaux nationaux
   */
  private async calculateNationalTotals(): Promise<TotalsDto> {
    // Agrégation des données de tous les bureaux de vote
    const aggregation = await this.prisma.tblBv.aggregate({
      _sum: {
        inscrits: true,
        populationHommes: true,
        populationFemmes: true,
        totalVotants: true,
        votantsHommes: true,
        votantsFemmes: true,
        bulletinsNuls: true,
        bulletinsBlancs: true
      },
      _count: {
        id: true
      }
    });

    const totals = aggregation._sum;
    const inscrits = totals.inscrits || 0;
    const votants = totals.totalVotants || 0;
    const exprimes = votants - (totals.bulletinsNuls || 0) - (totals.bulletinsBlancs || 0);

    // Calcul des résultats par candidat
    const results = await this.calculateCandidateResults();

    return {
      inscrits,
      inscritsHommes: totals.populationHommes || 0,
      inscritsFemmes: totals.populationFemmes || 0,
      votants,
      votantsHommes: totals.votantsHommes || 0,
      votantsFemmes: totals.votantsFemmes || 0,
      exprimes,
      blancs: totals.bulletinsBlancs || 0,
      nuls: totals.bulletinsNuls || 0,
      tauxParticipation: inscrits > 0 ? Number(((votants / inscrits) * 100).toFixed(2)) : 0,
      results
    };
  }

  /**
   * Calculer les résultats par candidat
   */
  private async calculateCandidateResults(): Promise<ResultDto[]> {
    const results = await this.prisma.tblResultat.groupBy({
      by: ['numeroOrdreCandidat'],
      _sum: {
        score: true
      }
    });

    const totalExprimes = await this.getTotalExprimes();

    return results.map(result => ({
      candidateId: result.numeroOrdreCandidat,
      votes: result._sum.score || 0,
      percentage: totalExprimes > 0 
        ? Number(((result._sum.score || 0) / totalExprimes * 100).toFixed(2))
        : 0
    }));
  }

  /**
   * Obtenir le total des suffrages exprimés
   */
  private async getTotalExprimes(): Promise<number> {
    const aggregation = await this.prisma.tblBv.aggregate({
      _sum: {
        totalVotants: true,
        bulletinsNuls: true,
        bulletinsBlancs: true
      }
    });

    const totals = aggregation._sum;
    return (totals.totalVotants || 0) - (totals.bulletinsNuls || 0) - (totals.bulletinsBlancs || 0);
  }

  /**
   * Récupérer les régions avec leurs résultats
   */
  private async getRegionsWithResults(query: ElectionResultsQueryDto): Promise<RegionDto[]> {
    const regions = await this.prisma.tblReg.findMany({
      include: {
        departements: {
          include: {
            lieuxVote: {
              include: {
                bureauxVote: {
                  include: {
                    resultats: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return regions.map(region => ({
      id: region.id,
      nom: region.libelleRegion,
      departements: region.departements.map(dept => ({
        id: dept.id,
        code: dept.codeDepartement,
        nom: dept.libelleDepartement,
        regionId: region.id,
        totals: this.calculateDepartementTotals(dept),
        lieuxVote: dept.lieuxVote.map(lv => ({
          id: lv.id,
          nom: lv.libelleLieuVote,
          adresse: `${dept.libelleDepartement}`,
          departementId: dept.id,
          totals: this.calculateLieuVoteTotals(lv),
          bureaux: lv.bureauxVote.map(bv => ({
            id: bv.id,
            numero: bv.numeroBureauVote,
            nom: `Bureau de vote ${bv.numeroBureauVote}`,
            lieuVoteId: lv.id,
            inscrits: bv.inscrits || 0,
            inscritsHommes: bv.populationHommes || 0,
            inscritsFemmes: bv.populationFemmes || 0,
            votants: bv.totalVotants || 0,
            votantsHommes: bv.votantsHommes || 0,
            votantsFemmes: bv.votantsFemmes || 0,
            exprimes: (bv.totalVotants || 0) - (bv.bulletinsNuls || 0) - (bv.bulletinsBlancs || 0),
            blancs: bv.bulletinsBlancs || 0,
            nuls: bv.bulletinsNuls || 0,
            tauxParticipation: bv.tauxParticipation || 0,
            results: this.calculateBureauResults(bv.resultats)
          }))
        }))
      })),
      totals: this.calculateRegionTotals(region)
    }));
  }

  /**
   * Calculer les totaux d'un département
   */
  private calculateDepartementTotals(dept: any): TotalsDto {
    let inscrits = 0, inscritsHommes = 0, inscritsFemmes = 0;
    let votants = 0, votantsHommes = 0, votantsFemmes = 0;
    let blancs = 0, nuls = 0;

    dept.lieuxVote.forEach((lv: any) => {
      lv.bureauxVote.forEach((bv: any) => {
        inscrits += bv.inscrits || 0;
        inscritsHommes += bv.populationHommes || 0;
        inscritsFemmes += bv.populationFemmes || 0;
        votants += bv.totalVotants || 0;
        votantsHommes += bv.votantsHommes || 0;
        votantsFemmes += bv.votantsFemmes || 0;
        blancs += bv.bulletinsBlancs || 0;
        nuls += bv.bulletinsNuls || 0;
      });
    });

    const exprimes = votants - blancs - nuls;

    return {
      inscrits,
      inscritsHommes,
      inscritsFemmes,
      votants,
      votantsHommes,
      votantsFemmes,
      exprimes,
      blancs,
      nuls,
      tauxParticipation: inscrits > 0 ? Number(((votants / inscrits) * 100).toFixed(2)) : 0,
      results: [] // Sera calculé au niveau national
    };
  }

  /**
   * Calculer les totaux d'un lieu de vote
   */
  private calculateLieuVoteTotals(lv: any): TotalsDto {
    let inscrits = 0, inscritsHommes = 0, inscritsFemmes = 0;
    let votants = 0, votantsHommes = 0, votantsFemmes = 0;
    let blancs = 0, nuls = 0;

    lv.bureauxVote.forEach((bv: any) => {
      inscrits += bv.inscrits || 0;
      inscritsHommes += bv.populationHommes || 0;
      inscritsFemmes += bv.populationFemmes || 0;
      votants += bv.totalVotants || 0;
      votantsHommes += bv.votantsHommes || 0;
      votantsFemmes += bv.votantsFemmes || 0;
      blancs += bv.bulletinsBlancs || 0;
      nuls += bv.bulletinsNuls || 0;
    });

    const exprimes = votants - blancs - nuls;

    return {
      inscrits,
      inscritsHommes,
      inscritsFemmes,
      votants,
      votantsHommes,
      votantsFemmes,
      exprimes,
      blancs,
      nuls,
      tauxParticipation: inscrits > 0 ? Number(((votants / inscrits) * 100).toFixed(2)) : 0,
      results: [] // Sera calculé au niveau national
    };
  }

  /**
   * Calculer les résultats d'un bureau de vote
   */
  private calculateBureauResults(resultats: any[]): ResultDto[] {
    const totalExprimes = resultats.reduce((sum, r) => sum + (r.score || 0), 0);
    
    return resultats.map(resultat => ({
      candidateId: resultat.numeroOrdreCandidat,
      votes: resultat.score || 0,
      percentage: totalExprimes > 0 
        ? Number(((resultat.score || 0) / totalExprimes * 100).toFixed(2))
        : 0
    }));
  }

  /**
   * Calculer les totaux d'une région
   */
  private calculateRegionTotals(region: any): TotalsDto {
    let inscrits = 0, inscritsHommes = 0, inscritsFemmes = 0;
    let votants = 0, votantsHommes = 0, votantsFemmes = 0;
    let blancs = 0, nuls = 0;

    region.departements.forEach((dept: any) => {
      dept.lieuxVote.forEach((lv: any) => {
        lv.bureauxVote.forEach((bv: any) => {
          inscrits += bv.inscrits || 0;
          inscritsHommes += bv.populationHommes || 0;
          inscritsFemmes += bv.populationFemmes || 0;
          votants += bv.totalVotants || 0;
          votantsHommes += bv.votantsHommes || 0;
          votantsFemmes += bv.votantsFemmes || 0;
          blancs += bv.bulletinsBlancs || 0;
          nuls += bv.bulletinsNuls || 0;
        });
      });
    });

    const exprimes = votants - blancs - nuls;

    return {
      inscrits,
      inscritsHommes,
      inscritsFemmes,
      votants,
      votantsHommes,
      votantsFemmes,
      exprimes,
      blancs,
      nuls,
      tauxParticipation: inscrits > 0 ? Number(((votants / inscrits) * 100).toFixed(2)) : 0,
      results: [] // Sera calculé au niveau national
    };
  }

  /**
   * Calculer les statistiques
   */
  private async calculateStatistics(): Promise<StatisticsDto> {
    const bureauCount = await this.prisma.tblBv.count();
    const bureauTraites = await this.prisma.tblBv.count({
      where: {
        totalVotants: {
          gt: 0
        }
      }
    });

    return {
      bureauTraites,
      bureauTotal: bureauCount,
      pourcentageTraite: bureauCount > 0 
        ? Number(((bureauTraites / bureauCount) * 100).toFixed(2))
        : 0,
      tendances: [] // À implémenter selon les besoins
    };
  }

  /**
   * Obtenir les statistiques par défaut
   */
  private getDefaultStatistics(): StatisticsDto {
    return {
      bureauTraites: 0,
      bureauTotal: 0,
      pourcentageTraite: 0,
      tendances: []
    };
  }

  /**
   * Déterminer le gagnant
   */
  private determineWinner(results: ResultDto[]): ResultDto | null {
    if (results.length === 0) return null;
    
    return results.reduce((winner, current) => 
      current.votes > winner.votes ? current : winner
    );
  }

  /**
   * Obtenir la liste des départements publiés
   */
  private async getPublishedDepartements(): Promise<string[]> {
    try {
      // D'abord, vérifier quelles sont les valeurs de statutPublication disponibles
      const allDepartements = await this.prisma.tblDept.findMany({
        select: {
          libelleDepartement: true,
          statutPublication: true
        }
      });

      console.log('🔍 Valeurs de statutPublication trouvées:', 
        [...new Set(allDepartements.map(d => d.statutPublication))]);

      // Chercher les départements avec différents statuts possibles
      const departements = await this.prisma.tblDept.findMany({
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
          libelleDepartement: true,
          statutPublication: true
        }
      });

      console.log('📊 Départements trouvés:', departements.length);
      departements.forEach(dept => {
        console.log(`  • ${dept.libelleDepartement} (${dept.statutPublication})`);
      });

      return departements.map(dept => dept.libelleDepartement);
    } catch (error) {
      console.error('❌ Erreur getPublishedDepartements:', error);
      return [];
    }
  }

  /**
   * Obtenir la couleur d'un parti
   */
  private getPartyColor(partyCode: string): string {
    const colors: { [key: string]: string } = {
      'rhdp': '#FF6B35',
      'fpi': '#1E3A8A',
      'pdci': '#059669',
      'udci': '#DC2626',
      'independant': '#6B7280'
    };
    
    return colors[partyCode.toLowerCase()] || '#6B7280';
  }

  // Méthodes pour les autres niveaux (régional, départemental, bureau)
  private async getRegionalResults(
    electionId: string,
    candidates: CandidateDto[],
    query: ElectionResultsQueryDto
  ): Promise<ElectionResultsDto> {
    // Implémentation similaire mais filtrée par région
    return this.getNationalResults(electionId, candidates, query);
  }

  private async getDepartementalResults(
    electionId: string,
    candidates: CandidateDto[],
    query: ElectionResultsQueryDto
  ): Promise<ElectionResultsDto> {
    // Implémentation similaire mais filtrée par département
    return this.getNationalResults(electionId, candidates, query);
  }

  private async getBureauResults(
    electionId: string,
    candidates: CandidateDto[],
    query: ElectionResultsQueryDto
  ): Promise<ElectionResultsDto> {
    // Implémentation similaire mais filtrée par bureau
    return this.getNationalResults(electionId, candidates, query);
  }
}
