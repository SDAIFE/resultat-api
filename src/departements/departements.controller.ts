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
  ParseBoolPipe
} from '@nestjs/common';
import { DepartementsService } from './departements.service';
import { AssignUserDto, UnassignUserDto } from './dto/assign-user.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';
import { DepartementResponseDto, DepartementListResponseDto, DepartementStatsDto } from './dto/departement-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('departements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  /**
   * Récupérer tous les départements avec pagination
   */
  @Get()
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('regionCode') regionCode?: string,
    @Query('hasUser', new DefaultValuePipe(undefined), ParseBoolPipe) hasUser?: boolean,
  ): Promise<DepartementListResponseDto> {
    return this.departementsService.findAll(page, limit, search, regionCode, hasUser);
  }

  /**
   * Récupérer un département par code
   */
  @Get(':codeDepartement')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findOne(@Param('codeDepartement') codeDepartement: string): Promise<DepartementResponseDto> {
    return this.departementsService.findOne(codeDepartement);
  }

  /**
   * Mettre à jour un département
   */
  @Patch(':codeDepartement')
  @Roles('SADMIN', 'ADMIN')
  async update(
    @Param('codeDepartement') codeDepartement: string,
    @Body() updateDepartementDto: UpdateDepartementDto
  ): Promise<DepartementResponseDto> {
    return this.departementsService.update(codeDepartement, updateDepartementDto);
  }

  /**
   * Assigner un utilisateur à un département
   */
  @Patch(':codeDepartement/assign-user')
  @Roles('SADMIN', 'ADMIN')
  async assignUser(
    @Param('codeDepartement') codeDepartement: string,
    @Body() assignUserDto: AssignUserDto
  ): Promise<DepartementResponseDto> {
    return this.departementsService.assignUser(codeDepartement, assignUserDto);
  }

  /**
   * Retirer l'utilisateur d'un département
   */
  @Patch(':codeDepartement/unassign-user')
  @Roles('SADMIN', 'ADMIN')
  async unassignUser(
    @Param('codeDepartement') codeDepartement: string,
    @Body() unassignUserDto?: UnassignUserDto
  ): Promise<DepartementResponseDto> {
    return this.departementsService.unassignUser(codeDepartement, unassignUserDto);
  }

  /**
   * Obtenir les statistiques des départements
   */
  @Get('stats/overview')
  @Roles('SADMIN', 'ADMIN')
  async getStats(): Promise<DepartementStatsDto> {
    return this.departementsService.getStats();
  }

  /**
   * Récupérer les départements d'une région
   */
  @Get('region/:codeRegion')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async findByRegion(@Param('codeRegion') codeRegion: string): Promise<DepartementResponseDto[]> {
    return this.departementsService.findByRegion(codeRegion);
  }

  /**
   * Récupérer la liste simple des départements (pour les formulaires)
   */
  @Get('list/simple')
  @Roles('SADMIN', 'ADMIN', 'USER')
  async getSimpleList(): Promise<{ codeDepartement: string; libelleDepartement: string }[]> {
    return this.departementsService.getSimpleList();
  }
}
