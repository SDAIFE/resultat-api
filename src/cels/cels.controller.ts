import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Query, 
  Body,
  UseGuards, 
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe
} from '@nestjs/common';
import { CelsService } from './cels.service';
import { CelFilterDto } from './dto/cel-filter.dto';
import { CelUpdateDto, CelAssignUserDto } from './dto/cel-response.dto';
import { CelResponseDto, CelListResponseDto, CelStatsDto } from './dto/cel-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CelsController {
  constructor(private readonly celsService: CelsService) {}

  /**
   * Récupérer toutes les CELs avec pagination et filtres
   */
  @Get()
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query(new ValidationPipe({ transform: true })) filters: CelFilterDto,
  ): Promise<CelListResponseDto> {
    return this.celsService.findAll(page, limit, filters);
  }

  /**
   * Récupérer une CEL par code
   */
  @Get(':codeCellule')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findOne(@Param('codeCellule') codeCellule: string): Promise<CelResponseDto> {
    return this.celsService.findOne(codeCellule);
  }

  /**
   * Mettre à jour une CEL
   */
  @Patch(':codeCellule')
  @Roles('SADMIN', 'ADMIN')
  async update(
    @Param('codeCellule') codeCellule: string,
    @Body() updateDto: CelUpdateDto
  ): Promise<CelResponseDto> {
    return this.celsService.update(codeCellule, updateDto);
  }

  /**
   * Assigner un utilisateur à une CEL
   */
  @Patch(':codeCellule/assign-user')
  @Roles('SADMIN', 'ADMIN')
  async assignUser(
    @Param('codeCellule') codeCellule: string,
    @Body() assignUserDto: CelAssignUserDto
  ): Promise<CelResponseDto> {
    return this.celsService.assignUser(codeCellule, assignUserDto);
  }

  /**
   * Retirer l'utilisateur d'une CEL
   */
  @Patch(':codeCellule/unassign-user')
  @Roles('SADMIN', 'ADMIN')
  async unassignUser(@Param('codeCellule') codeCellule: string): Promise<CelResponseDto> {
    return this.celsService.unassignUser(codeCellule);
  }

  /**
   * Obtenir les statistiques des CELs
   */
  @Get('stats/overview')
  @Roles('SADMIN', 'ADMIN')
  async getStats(): Promise<CelStatsDto> {
    return this.celsService.getStats();
  }

  /**
   * Récupérer les CELs d'un département
   */
  @Get('departement/:codeDepartement')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findByDepartement(@Param('codeDepartement') codeDepartement: string): Promise<CelResponseDto[]> {
    return this.celsService.findByDepartement(codeDepartement);
  }

  /**
   * Récupérer les CELs d'une région
   */
  @Get('region/:codeRegion')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findByRegion(@Param('codeRegion') codeRegion: string): Promise<CelResponseDto[]> {
    // Utiliser le filtre par région
    const filters: CelFilterDto = { regionCode: codeRegion };
    const result = await this.celsService.findAll(1, 1000, filters);
    return result.cels;
  }

  /**
   * Récupérer les CELs sans utilisateur assigné
   */
  @Get('unassigned/list')
  @Roles('SADMIN', 'ADMIN')
  async findUnassigned(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<CelListResponseDto> {
    const filters: CelFilterDto = { hasUser: false };
    return this.celsService.findAll(page, limit, filters);
  }

  /**
   * Récupérer les CELs par type
   */
  @Get('type/:typeCellule')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findByType(
    @Param('typeCellule') typeCellule: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<CelListResponseDto> {
    const filters: CelFilterDto = { typeCellule };
    return this.celsService.findAll(page, limit, filters);
  }

  /**
   * Récupérer la liste simple des CELs (pour les formulaires)
   */
  @Get('list/simple')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getSimpleList(): Promise<{ codeCellule: string; libelleCellule: string }[]> {
    return this.celsService.getSimpleList();
  }
}
