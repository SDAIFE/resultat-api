import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  ValidationPipe,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { ResultatsService } from './resultats.service';
import { 
  ElectionResultsResponseDto, 
  ElectionResultsQueryDto 
} from './dto/election-results.dto';
import { 
  ElectionHeaderResponseDto 
} from './dto/election-header.dto';
import { 
  PublishedZonesResponseDto
} from './dto/published-zones.dto';
import { 
  ResultsByZoneResponseDto,
  ResultsByZoneQueryDto
} from './dto/results-by-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOrApiTokenGuard } from '../auth/guards/jwt-or-api-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Résultats Électoraux')
@Controller('elections')
@UseGuards(JwtOrApiTokenGuard, RolesGuard)
@ApiBearerAuth()
export class ResultatsController {
  constructor(private readonly resultatsService: ResultatsService) {}

  /**
   * GET /api/v1/elections/{electionId}/results/header
   * Récupérer les données du header des résultats électoraux (approche simplifiée)
   */
  @Get(':electionId/results/header')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer les données du header des résultats',
    description: 'Récupère uniquement les données essentielles pour le header des résultats électoraux. Accessible avec JWT utilisateur ou token API public.'
  })
  @ApiParam({ 
    name: 'electionId', 
    description: 'Identifiant de l\'élection',
    example: 'election-2025'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Données du header récupérées avec succès',
    type: ElectionHeaderResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètres invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié - Token JWT ou API manquant/invalide' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Élection non trouvée' 
  })
  async getElectionHeader(
    @Param('electionId') electionId: string
  ): Promise<ElectionHeaderResponseDto> {
    try {
      // Validation de l'electionId
      if (!electionId || electionId.trim() === '') {
        throw new HttpException(
          'L\'identifiant de l\'élection est requis',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.resultatsService.getElectionHeader(electionId);

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Gestion des erreurs Prisma
      if (error.code === 'P2025') {
        throw new HttpException(
          `Élection avec l'ID ${electionId} non trouvée`,
          HttpStatus.NOT_FOUND
        );
      }

      // Erreur serveur générique
      throw new HttpException(
        'Une erreur interne du serveur s\'est produite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/elections/{electionId}/results
   * Récupérer les données complètes des résultats électoraux
   */
  @Get(':electionId/results')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer les résultats électoraux',
    description: 'Récupère les données complètes des résultats électoraux pour l\'affichage de la page des résultats'
  })
  @ApiParam({ 
    name: 'electionId', 
    description: 'Identifiant de l\'élection',
    example: 'election-2025'
  })
  @ApiQuery({ 
    name: 'level', 
    description: 'Niveau de détail (national, regional, departemental, bureau)',
    required: false,
    enum: ['national', 'regional', 'departemental', 'bureau']
  })
  @ApiQuery({ 
    name: 'regionId', 
    description: 'Filtrer par région spécifique',
    required: false
  })
  @ApiQuery({ 
    name: 'departementId', 
    description: 'Filtrer par département spécifique',
    required: false
  })
  @ApiQuery({ 
    name: 'includeStatistics', 
    description: 'Inclure les statistiques avancées',
    required: false,
    type: Boolean
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Résultats électoraux récupérés avec succès',
    type: ElectionResultsResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètres invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Élection non trouvée' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Erreur serveur' 
  })
  async getElectionResults(
    @Param('electionId') electionId: string,
    @Query(new ValidationPipe({ transform: true })) query: ElectionResultsQueryDto
  ): Promise<ElectionResultsResponseDto> {
    try {
      // Validation de l'electionId
      if (!electionId || electionId.trim() === '') {
        throw new HttpException(
          'L\'identifiant de l\'élection est requis',
          HttpStatus.BAD_REQUEST
        );
      }

      // Validation des paramètres de requête
      if (query.level && !['national', 'regional', 'departemental', 'bureau'].includes(query.level)) {
        throw new HttpException(
          'Le niveau doit être l\'un des suivants: national, regional, departemental, bureau',
          HttpStatus.BAD_REQUEST
        );
      }

      // Conversion des paramètres booléens
      if (query.includeStatistics !== undefined) {
        if (typeof query.includeStatistics === 'string') {
          query.includeStatistics = query.includeStatistics === 'true';
        }
      }

      return await this.resultatsService.getElectionResults(electionId, query);

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Gestion des erreurs Prisma
      if (error.code === 'P2025') {
        throw new HttpException(
          `Élection avec l'ID ${electionId} non trouvée`,
          HttpStatus.NOT_FOUND
        );
      }

      // Erreur serveur générique
      throw new HttpException(
        'Une erreur interne du serveur s\'est produite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/elections/{electionId}/results/summary
   * Récupérer un résumé des résultats électoraux (pour les performances)
   */
  @Get(':electionId/results/summary')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer un résumé des résultats',
    description: 'Récupère un résumé rapide des résultats électoraux pour les performances'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Résumé des résultats récupéré avec succès'
  })
  async getElectionResultsSummary(
    @Param('electionId') electionId: string
  ): Promise<any> {
    try {
      // Implémentation d'un résumé léger pour les performances
      const query = { includeStatistics: false };
      const results = await this.resultatsService.getElectionResults(electionId, query);
      
      // Retourner seulement les données essentielles
      return {
        success: true,
        data: {
          id: results.data.id,
          nom: results.data.nom,
          status: results.data.status,
          lastUpdate: results.data.lastUpdate,
          totals: results.data.totals,
          candidates: results.data.candidates.map(c => ({
            id: c.id,
            fullName: c.fullName,
            numero: c.numero,
            isWinner: c.isWinner
          }))
        },
        message: 'Résumé des résultats récupéré avec succès'
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Une erreur interne du serveur s\'est produite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/elections/{electionId}/results/candidates-detailed
   * Récupérer les informations complètes des candidats avec leurs résultats électoraux
   */
  @Get(':electionId/results/published-zones')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer les zones géographiques avec résultats publiés',
    description: 'Retourne uniquement les zones géographiques (Région → Département → Lieu de vote → Bureau de vote) dont les résultats électoraux ont été publiés. Accessible avec JWT utilisateur ou token API public.'
  })
  @ApiParam({ 
    name: 'electionId', 
    description: 'Identifiant de l\'élection', 
    example: 'election-2025' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Zones avec résultats publiés récupérées avec succès',
    type: PublishedZonesResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètres invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié - Token JWT ou API manquant/invalide' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé - Rôle insuffisant' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Élection non trouvée' 
  })
  async getPublishedZones(
    @Param('electionId') electionId: string
  ): Promise<PublishedZonesResponseDto> {
    return this.resultatsService.getPublishedZones(electionId);
  }

  @Get(':electionId/results/candidates-detailed')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer les informations complètes des candidats',
    description: 'Récupère toutes les informations des candidats avec leurs résultats électoraux pour l\'affichage dans l\'onglet Résultats par candidat. Accessible avec JWT utilisateur ou token API public.'
  })
  @ApiParam({ 
    name: 'electionId', 
    description: 'Identifiant de l\'élection',
    example: 'election-2025'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations complètes des candidats récupérées avec succès'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètres invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié - Token JWT ou API manquant/invalide' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Élection non trouvée' 
  })
  async getCandidatesDetailed(
    @Param('electionId') electionId: string
  ): Promise<any> {
    try {
      // Validation de l'electionId
      if (!electionId || electionId.trim() === '') {
        throw new HttpException(
          'L\'identifiant de l\'élection est requis',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.resultatsService.getCandidatesDetailed(electionId);

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Gestion des erreurs Prisma
      if (error.code === 'P2025') {
        throw new HttpException(
          `Élection avec l'ID ${electionId} non trouvée`,
          HttpStatus.NOT_FOUND
        );
      }

      // Erreur serveur générique
      throw new HttpException(
        'Une erreur interne du serveur s\'est produite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/elections/{electionId}/results/candidates
   * Récupérer uniquement la liste des candidats
   */
  @Get(':electionId/results/candidates')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer la liste des candidats',
    description: 'Récupère uniquement la liste des candidats pour l\'élection'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des candidats récupérée avec succès'
  })
  async getElectionCandidates(
    @Param('electionId') electionId: string
  ): Promise<any> {
    try {
      const query = { includeStatistics: false };
      const results = await this.resultatsService.getElectionResults(electionId, query);
      
      return {
        success: true,
        data: results.data.candidates,
        message: 'Liste des candidats récupérée avec succès'
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Une erreur interne du serveur s\'est produite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/elections/{electionId}/results/by-zone
   * Récupérer les résultats électoraux par zone
   */
  @Get(':electionId/results/by-zone')
  @Roles('ADMIN', 'USER', 'VIEWER', 'SADMIN')
  @ApiOperation({ 
    summary: 'Récupérer les résultats par zone',
    description: 'Récupère les résultats électoraux agrégés selon le niveau de zone sélectionné (région, département, lieu de vote, ou bureau de vote). Accessible avec JWT utilisateur ou token API public.'
  })
  @ApiParam({ 
    name: 'electionId', 
    description: 'Identifiant de l\'élection',
    example: 'election-2025'
  })
  @ApiQuery({ 
    name: 'regionId', 
    description: 'Identifiant de la région (optionnel)',
    required: false,
    example: 'lagunes'
  })
  @ApiQuery({ 
    name: 'departmentId', 
    description: 'Identifiant du département (optionnel)',
    required: false,
    example: 'abidjan-1'
  })
  @ApiQuery({ 
    name: 'votingPlaceId', 
    description: 'Identifiant du lieu de vote (optionnel)',
    required: false,
    example: 'lycee-technique'
  })
  @ApiQuery({ 
    name: 'pollingStationId', 
    description: 'Identifiant du bureau de vote (optionnel)',
    required: false,
    example: 'bureau-001'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Résultats récupérés avec succès',
    type: ResultsByZoneResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètres manquants ou invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié - Token JWT ou API manquant/invalide' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Zone non trouvée ou sans résultats publiés' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Erreur serveur' 
  })
  async getResultsByZone(
    @Param('electionId') electionId: string,
    @Query(new ValidationPipe({ transform: true })) query: ResultsByZoneQueryDto
  ): Promise<ResultsByZoneResponseDto> {
    return this.resultatsService.getResultsByZone(electionId, query);
  }
}
