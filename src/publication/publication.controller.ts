import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe
} from '@nestjs/common';
import { PublicationService } from './publication.service';
import { 
  DepartmentStatsResponse, 
  DepartmentListResponse, 
  PublicationActionResult,
  DepartmentDetailsResponse,
  DepartmentListQuery,
  DepartmentDataResponse
} from './dto/publication-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('publications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  /**
   * 1️⃣ GET /api/publications/stats
   * Récupérer les statistiques des départements
   */
  @Get('stats')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getStats(@CurrentUser() user: any): Promise<DepartmentStatsResponse> {
    return this.publicationService.getStats(user.id, user.role?.code);
  }

  /**
   * 2️⃣ GET /api/publications/departments
   * Récupérer la liste des départements avec leurs métriques
   */
  @Get('departments')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getDepartments(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('codeDepartement') codeDepartement?: string,
    @Query('publicationStatus') publicationStatus?: 'PUBLISHED' | 'CANCELLED' | 'PENDING',
    @Query('search') search?: string
  ): Promise<DepartmentListResponse> {
    const query: DepartmentListQuery = {
      page,
      limit,
      codeDepartement,
      publicationStatus,
      search
    };
    
    return this.publicationService.getDepartments(query, user.id, user.role?.code);
  }

  /**
   * 3️⃣ POST /api/publications/departments/:id/publish
   * Publier un département
   */
  @Post('departments/:id/publish')
  @Roles('SADMIN', 'ADMIN')
  async publishDepartment(
    @Param('id') id: string,
    @CurrentUser() user: any
  ): Promise<PublicationActionResult> {
    return this.publicationService.publishDepartment(id, user.id);
  }

  /**
   * 4️⃣ POST /api/publications/departments/:id/cancel
   * Annuler la publication d'un département
   */
  @Post('departments/:id/cancel')
  @Roles('SADMIN', 'ADMIN')
  async cancelPublication(
    @Param('id') id: string,
    @CurrentUser() user: any
  ): Promise<PublicationActionResult> {
    return this.publicationService.cancelPublication(id, user.id);
  }

  /**
   * 5️⃣ GET /api/publications/departments/:id/details
   * Récupérer les détails complets d'un département
   */
  @Get('departments/:id/details')
  @Roles('SADMIN', 'ADMIN')
  async getDepartmentDetails(
    @Param('id') id: string
  ): Promise<DepartmentDetailsResponse> {
    return this.publicationService.getDepartmentDetails(id);
  }

  /**
   * 6️⃣ GET /api/publications/departments/:codeDepartement/data
   * Récupérer les données agrégées d'un département avec ses CELs
   */
  @Get('departments/:codeDepartement/data')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getDepartmentData(
    @Param('codeDepartement') codeDepartement: string,
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ): Promise<DepartmentDataResponse> {
    const query = {
      page,
      limit,
      codeDepartement,
      search
    };
    
    return this.publicationService.getDepartmentsData(query, user.id, user.role?.code);
  }
}
