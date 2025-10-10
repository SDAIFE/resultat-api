import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de réponse pour une région complète
 */
export class RegionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'R01' })
  codeRegion: string;

  @ApiProperty({ example: 'District Autonome d\'Abidjan' })
  libelleRegion: string;

  @ApiProperty({ example: 'D01', required: false })
  codeDistrict?: string;

  @ApiProperty({ required: false })
  district?: {
    id: string;
    codeDistrict: string;
    libelleDistrict: string;
  };

  @ApiProperty({ type: [Object], required: false })
  departements?: Array<{
    id: string;
    codeDepartement: string;
    libelleDepartement: string;
  }>;
}

/**
 * DTO de réponse paginée pour les régions
 */
export class RegionListResponseDto {
  @ApiProperty({ type: [RegionResponseDto] })
  regions: RegionResponseDto[];

  @ApiProperty({ example: 31 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 4 })
  totalPages: number;
}

/**
 * DTO de statistiques pour les régions
 */
export class RegionStatsDto {
  @ApiProperty({ example: 31 })
  totalRegions: number;

  @ApiProperty({ example: 2 })
  totalDistricts: number;

  @ApiProperty({ example: 108 })
  totalDepartements: number;
}

