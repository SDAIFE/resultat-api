import { 
  Controller, 
  Get, 
  Post,
  Query, 
  UseGuards, 
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
  Logger
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { 
  UserDashboardStatsDto, 
  AdminDashboardStatsDto, 
  SadminDashboardStatsDto 
} from './dto/dashboard-stats.dto';
import { DashboardCelListResponseDto, DashboardCelFilterDto } from './dto/dashboard-cel.dto';
import { RealtimeMetricsDto, RefreshMetricsResponseDto } from './dto/realtime-metrics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Récupère les statistiques du dashboard selon le rôle de l'utilisateur
   */
  @Get('stats')
  async getDashboardStats(@CurrentUser() user: any): Promise<UserDashboardStatsDto | AdminDashboardStatsDto | SadminDashboardStatsDto> {
    const userRole = user.role?.code || 'USER';
    
    switch (userRole) {
      case 'SADMIN':
        return this.dashboardService.getSadminDashboardStats();
      case 'ADMIN':
        return this.dashboardService.getAdminDashboardStats(user.id);
      case 'USER':
      default:
        return this.dashboardService.getUserDashboardStats(user.id);
    }
  }

  /**
   * Récupère les statistiques spécifiques pour les utilisateurs USER
   */
  @Get('stats/user')
  @Roles('USER')
  async getUserStats(@CurrentUser() user: any): Promise<UserDashboardStatsDto> {
    return this.dashboardService.getUserDashboardStats(user.id);
  }

  /**
   * Récupère les statistiques spécifiques pour les administrateurs
   */
  @Get('stats/admin')
  @Roles('ADMIN')
  async getAdminStats(@CurrentUser() user: any): Promise<AdminDashboardStatsDto> {
    return this.dashboardService.getAdminDashboardStats(user.id);
  }

  /**
   * Récupère les statistiques spécifiques pour les super administrateurs
   */
  @Get('stats/sadmin')
  @Roles('SADMIN')
  async getSadminStats(): Promise<SadminDashboardStatsDto> {
    return this.dashboardService.getSadminDashboardStats();
  }

  /**
   * Récupère la liste des CELs pour le dashboard
   */
  @Get('cels')
  async getDashboardCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query(new ValidationPipe({ transform: true })) filters: DashboardCelFilterDto,
  ): Promise<DashboardCelListResponseDto> {
    const userRole = user.role?.code || 'USER';
    return this.dashboardService.getDashboardCels(user.id, userRole, page, limit, filters);
  }

  /**
   * Récupère les CELs assignées à l'utilisateur (USER)
   */
  @Get('cels/my-cels')
  @Roles('USER')
  async getMyCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query(new ValidationPipe({ transform: true })) filters: DashboardCelFilterDto,
  ): Promise<DashboardCelListResponseDto> {
    return this.dashboardService.getDashboardCels(user.id, 'USER', page, limit, filters);
  }

  /**
   * Récupère les CELs des départements assignés (ADMIN)
   */
  @Get('cels/department-cels')
  @Roles('ADMIN')
  async getDepartmentCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query(new ValidationPipe({ transform: true })) filters: DashboardCelFilterDto,
  ): Promise<DashboardCelListResponseDto> {
    return this.dashboardService.getDashboardCels(user.id, 'ADMIN', page, limit, filters);
  }

  /**
   * Récupère toutes les CELs (SADMIN)
   */
  @Get('cels/all-cels')
  @Roles('SADMIN')
  async getAllCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query(new ValidationPipe({ transform: true })) filters: DashboardCelFilterDto,
  ): Promise<DashboardCelListResponseDto> {
    return this.dashboardService.getDashboardCels(user.id, 'SADMIN', page, limit, filters);
  }

  /**
   * Récupère les CELs par statut d'import
   */
  @Get('cels/status/:status')
  async getCelsByStatus(
    @CurrentUser() user: any,
    @Query('status') status: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<DashboardCelListResponseDto> {
    const userRole = user.role?.code || 'USER';
    const filters: DashboardCelFilterDto = { statutImport: status };
    return this.dashboardService.getDashboardCels(user.id, userRole, page, limit, filters);
  }

  /**
   * Récupère les CELs sans import
   */
  @Get('cels/pending-imports')
  async getPendingImportCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<DashboardCelListResponseDto> {
    const userRole = user.role?.code || 'USER';
    const filters: DashboardCelFilterDto = { statutImport: 'PENDING' };
    return this.dashboardService.getDashboardCels(user.id, userRole, page, limit, filters);
  }

  /**
   * Récupère les CELs avec import réussi
   */
  @Get('cels/completed-imports')
  async getCompletedImportCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<DashboardCelListResponseDto> {
    const userRole = user.role?.code || 'USER';
    const filters: DashboardCelFilterDto = { statutImport: 'IMPORTED' };
    return this.dashboardService.getDashboardCels(user.id, userRole, page, limit, filters);
  }

  /**
   * Récupère les CELs en erreur
   */
  @Get('cels/error-imports')
  async getErrorImportCels(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<DashboardCelListResponseDto> {
    const userRole = user.role?.code || 'USER';
    const filters: DashboardCelFilterDto = { statutImport: 'ERROR' };
    return this.dashboardService.getDashboardCels(user.id, userRole, page, limit, filters);
  }

  // ===========================================
  // ENDPOINTS SELON LES DIRECTIVES
  // ===========================================

  /**
   * GET /api/dashboard/metrics - Métriques selon le rôle
   * Endpoint principal qui retourne les métriques selon le rôle de l'utilisateur
   */
  @Get('metrics')
  async getMetrics(@CurrentUser() user: any): Promise<any> {
    const userRole = user.role?.code || 'USER';
    
    try {
      let data: any;
      let message: string;
      
      switch (userRole) {
        case 'SADMIN':
          data = await this.dashboardService.getSadminDashboardStats();
          message = 'Métriques super administrateur récupérées avec succès';
          break;
        case 'ADMIN':
          data = await this.dashboardService.getAdminDashboardStats(user.id);
          message = 'Métriques administrateur récupérées avec succès';
          break;
        case 'USER':
        default:
          data = await this.dashboardService.getUserDashboardStats(user.id);
          message = 'Métriques utilisateur récupérées avec succès';
          break;
      }
      
      return {
        success: true,
        data,
        message
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération des métriques',
        error: error.message
      };
    }
  }

  /**
   * GET /api/dashboard/user-metrics - Métriques USER (restreintes)
   * Endpoint spécifique pour les utilisateurs USER avec données restreintes
   */
  @Get('user-metrics')
  @Roles('USER')
  async getUserMetrics(@CurrentUser() user: any): Promise<any> {
    try {
      const data = await this.dashboardService.getUserDashboardStats(user.id);
      
      return {
        success: true,
        data,
        message: 'Métriques utilisateur récupérées avec succès'
      };
    } catch (error) {
      this.logger.error(`❌ [DashboardController] Erreur métriques USER: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Erreur lors de la récupération des métriques utilisateur',
        error: error.message
      };
    }
  }

  /**
   * GET /api/dashboard/admin-metrics - Métriques ADMIN/SADMIN (complètes)
   * Endpoint spécifique pour les administrateurs avec toutes les données
   */
  @Get('admin-metrics')
  @Roles('ADMIN', 'SADMIN')
  async getAdminMetrics(@CurrentUser() user: any): Promise<any> {
    const userRole = user.role?.code || 'ADMIN';
    this.logger.log(`🔍 [DashboardController] Récupération métriques ${userRole} pour: ${user.email} (ID: ${user.id})`);
    
    try {
      let data: any;
      let message: string;
      
      if (userRole === 'SADMIN') {
        data = await this.dashboardService.getSadminDashboardStats();
        message = 'Métriques super administrateur récupérées avec succès';
      } else {
        data = await this.dashboardService.getAdminDashboardStats(user.id);
        message = 'Métriques administrateur récupérées avec succès';
      }
      
      this.logger.log(`📊 [DashboardController] Métriques ${userRole} récupérées: ${JSON.stringify(data)}`);
      
      return {
        success: true,
        data,
        message
      };
    } catch (error) {
      this.logger.error(`❌ [DashboardController] Erreur métriques ${userRole}: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Erreur lors de la récupération des métriques administrateur',
        error: error.message
      };
    }
  }

  /**
   * GET /api/dashboard/realtime-metrics - Métriques temps réel
   * Endpoint pour les métriques en temps réel (mises à jour fréquentes)
   */
  @Get('realtime-metrics')
  async getRealtimeMetrics(@CurrentUser() user: any): Promise<any> {
    try {
      const userRole = user.role?.code || 'USER';
      const data = await this.dashboardService.getRealtimeMetrics(user.id, userRole);
      return {
        success: true,
        data,
        message: 'Métriques temps réel récupérées avec succès'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération des métriques temps réel',
        error: error.message
      };
    }
  }

  /**
   * POST /api/dashboard/refresh-metrics - Rafraîchissement forcé
   * Endpoint pour forcer le rafraîchissement des métriques (invalidation du cache)
   */
  @Post('refresh-metrics')
  async refreshMetrics(@CurrentUser() user: any): Promise<RefreshMetricsResponseDto> {
    const userRole = user.role?.code || 'USER';
    await this.dashboardService.refreshMetrics(user.id, userRole);
    return {
      success: true,
      message: 'Métriques rafraîchies avec succès',
      timestamp: new Date()
    };
  }
}
