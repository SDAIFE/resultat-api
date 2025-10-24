import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ZoneType {
  REGION = 'region',
  DEPARTMENT = 'department',
  VOTING_PLACE = 'votingPlace',
  POLLING_STATION = 'pollingStation'
}

export class ZoneInfoDto {
  @ApiProperty({ 
    description: 'Type de zone', 
    enum: ZoneType,
    example: 'region' 
  })
  @IsEnum(ZoneType)
  type: ZoneType;

  @ApiProperty({ description: 'Identifiant de la zone', example: 'lagunes' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nom de la zone', example: 'Lagunes' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Zone parente' })
  parentZone: {
    type: string;
    name: string;
  };
}

export class StatisticsDto {
  @ApiProperty({ description: 'Nombre total d\'inscrits', example: 150000 })
  @IsNumber()
  totalInscrits: number;

  @ApiProperty({ description: 'Nombre total de votants', example: 120000 })
  @IsNumber()
  totalVotants: number;

  @ApiProperty({ description: 'Taux de participation en pourcentage', example: 80.0 })
  @IsNumber()
  tauxParticipation: number;

  @ApiProperty({ description: 'Nombre total de suffrages exprimés', example: 115000 })
  @IsNumber()
  totalExprimes: number;

  @ApiProperty({ description: 'Nombre total de bulletins blancs', example: 3000 })
  @IsNumber()
  totalBlancs: number;

  @ApiProperty({ description: 'Nombre total de bulletins nuls', example: 2000 })
  @IsNumber()
  totalNuls: number;

  @ApiProperty({ description: 'Nombre de bureaux de vote', example: 45 })
  @IsNumber()
  nombreBureaux: number;

  @ApiProperty({ description: 'Nombre de lieux de vote', example: 12 })
  @IsNumber()
  nombreLieuxVote: number;

  @ApiProperty({ description: 'Nombre de départements', example: 3 })
  @IsNumber()
  nombreDepartements: number;
}

export class CandidateResultDto {
  @ApiProperty({ description: 'Identifiant du candidat', example: 'cand-001' })
  @IsString()
  candidateId: string;

  @ApiProperty({ description: 'Nom complet du candidat', example: 'Alassane Ouattara' })
  @IsString()
  candidateName: string;

  @ApiProperty({ description: 'Numéro du candidat', example: 1 })
  @IsNumber()
  candidateNumber: number;

  @ApiProperty({ description: 'Nom du parti', example: 'RHDP' })
  @IsString()
  partyName: string;

  @ApiProperty({ description: 'Couleur du parti', example: '#FF6B35' })
  @IsString()
  partyColor: string;

  @ApiProperty({ description: 'Nombre de voix', example: 52000 })
  @IsNumber()
  votes: number;

  @ApiProperty({ description: 'Pourcentage de voix', example: 45.2 })
  @IsNumber()
  percentage: number;

  @ApiProperty({ description: 'Rang du candidat', example: 1 })
  @IsNumber()
  rank: number;

  @ApiProperty({ description: 'Est-ce le gagnant', example: true })
  @IsBoolean()
  isWinner: boolean;

  @ApiProperty({ description: 'Y a-t-il égalité', example: false })
  @IsBoolean()
  isTied: boolean;
}

export class SummaryDto {
  @ApiProperty({ description: 'Nombre total de candidats', example: 5 })
  @IsNumber()
  totalCandidates: number;

  @ApiProperty({ description: 'Informations du gagnant' })
  winner: {
    candidateId: string;
    candidateName: string;
    votes: number;
    percentage: number;
  };

  @ApiProperty({ description: 'Total des voix', example: 115000 })
  @IsNumber()
  totalVotes: number;

  @ApiProperty({ description: 'Pourcentage moyen', example: 20.0 })
  @IsNumber()
  averagePercentage: number;
}

export class ResultsByZoneDto {
  @ApiProperty({ description: 'Identifiant de l\'élection', example: 'election-2025' })
  @IsString()
  electionId: string;

  @ApiProperty({ description: 'Nom de l\'élection', example: 'Élection Présidentielle 2025 - Premier Tour' })
  @IsString()
  electionName: string;

  @ApiProperty({ description: 'Informations sur la zone', type: ZoneInfoDto })
  @ValidateNested()
  @Type(() => ZoneInfoDto)
  zoneInfo: ZoneInfoDto;

  @ApiProperty({ description: 'Statistiques de la zone', type: StatisticsDto })
  @ValidateNested()
  @Type(() => StatisticsDto)
  statistics: StatisticsDto;

  @ApiProperty({ description: 'Résultats par candidat', type: [CandidateResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateResultDto)
  results: CandidateResultDto[];

  @ApiProperty({ description: 'Résumé des résultats', type: SummaryDto })
  @ValidateNested()
  @Type(() => SummaryDto)
  summary: SummaryDto;
}

export class ResultsByZoneResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ResultsByZoneDto })
  data: ResultsByZoneDto;

  @ApiProperty({ example: 'Résultats récupérés avec succès' })
  message: string;

  @ApiProperty({ example: '2025-01-23T10:30:00.000Z' })
  timestamp: string;
}

export class ResultsByZoneQueryDto {
  @ApiProperty({ description: 'Identifiant de la région', required: false, example: 'lagunes' })
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiProperty({ description: 'Identifiant du département', required: false, example: 'abidjan-1' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: 'Identifiant du lieu de vote', required: false, example: 'lycee-technique' })
  @IsOptional()
  @IsString()
  votingPlaceId?: string;

  @ApiProperty({ description: 'Identifiant du bureau de vote', required: false, example: 'bureau-001' })
  @IsOptional()
  @IsString()
  pollingStationId?: string;
}
