import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { 
  UserDashboardStatsDto, 
  AdminDashboardStatsDto, 
  SadminDashboardStatsDto 
} from './dto/dashboard-stats.dto';
import { DashboardCelListResponseDto, DashboardCelFilterDto } from './dto/dashboard-cel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
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
}
