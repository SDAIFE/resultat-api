import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PollingStationDto {
  @ApiProperty({ description: 'Identifiant unique du bureau de vote', example: 'bureau-001' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nom du bureau de vote', example: 'Bureau 001' })
  @IsString()
  name: string;
}

export class VotingPlaceDto {
  @ApiProperty({ description: 'Identifiant unique du lieu de vote', example: 'lycee-technique' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nom du lieu de vote', example: 'Lycée Technique' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Liste des bureaux de vote', type: [PollingStationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollingStationDto)
  pollingStations: PollingStationDto[];
}

export class DepartmentDto {
  @ApiProperty({ description: 'Identifiant unique du département', example: 'abidjan-1' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nom du département', example: 'Abidjan 1' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Liste des lieux de vote', type: [VotingPlaceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VotingPlaceDto)
  votingPlaces: VotingPlaceDto[];
}

export class RegionDto {
  @ApiProperty({ description: 'Identifiant unique de la région', example: 'lagunes' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nom de la région', example: 'Lagunes' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Liste des départements', type: [DepartmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentDto)
  departments: DepartmentDto[];
}

export class PublishedZonesDto {
  @ApiProperty({ description: 'Identifiant de l\'élection', example: 'election-2025' })
  @IsString()
  electionId: string;

  @ApiProperty({ description: 'Nom de l\'élection', example: 'Élection Présidentielle 2025 - Premier Tour' })
  @IsString()
  electionName: string;

  @ApiProperty({ description: 'Liste des régions avec zones publiées', type: [RegionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegionDto)
  regions: RegionDto[];
}

export class PublishedZonesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PublishedZonesDto })
  data: PublishedZonesDto;

  @ApiProperty({ example: 'Zones avec résultats publiés récupérées avec succès' })
  message: string;

  @ApiProperty({ example: '2025-01-23T10:30:00.000Z' })
  timestamp: string;
}
