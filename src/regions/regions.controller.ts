import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { RegionResponseDto, RegionListResponseDto, RegionStatsDto } from './dto/region-response.dto';
import { SimpleRegionDto } from './dto/simple-region.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Régions')
@Controller('regions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  /**
   * Récupérer la liste simple des régions (pour les formulaires et filtres)
   */
  @Get('list/simple')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Liste simple des régions (code + libellé)' })
  @ApiResponse({
    status: 200,
    description: 'Liste des régions pour formulaires et filtres',
    type: [SimpleRegionDto],
  })
  async getSimpleList(): Promise<SimpleRegionDto[]> {
    return this.regionsService.getSimpleList();
  }

  /**
   * Récupérer toutes les régions avec pagination
   */
  @Get()
  @Roles('SADMIN', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Liste paginée des régions' })
  @ApiResponse({
    status: 200,
    description: 'Liste des régions avec pagination',
    type: RegionListResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('districtCode') districtCode?: string,
  ): Promise<RegionListResponseDto> {
    return this.regionsService.findAll(page, limit, search, districtCode);
  }

  /**
   * Obtenir les statistiques des régions
   */
  @Get('stats/overview')
  @Roles('SADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Statistiques globales des régions' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des régions',
    type: RegionStatsDto,
  })
  async getStats(): Promise<RegionStatsDto> {
    return this.regionsService.getStats();
  }

  /**
   * Récupérer une région par code
   */
  @Get(':codeRegion')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Détails d\'une région' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la région',
    type: RegionResponseDto,
  })
  async findOne(@Param('codeRegion') codeRegion: string): Promise<RegionResponseDto> {
    return this.regionsService.findOne(codeRegion);
  }

  /**
   * Récupérer les régions d'un district
   */
  @Get('district/:codeDistrict')
  @Roles('SADMIN', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Régions d\'un district' })
  @ApiResponse({
    status: 200,
    description: 'Liste des régions du district',
    type: [RegionResponseDto],
  })
  async findByDistrict(@Param('codeDistrict') codeDistrict: string): Promise<RegionResponseDto[]> {
    return this.regionsService.findByDistrict(codeDistrict);
  }
}

