import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PartyDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  sigle: string;

  @IsString()
  logo: string;

  @IsString()
  color: string;
}

export class CandidateDto {
  @IsString()
  id: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  fullName: string;

  @IsNumber()
  numero: number;

  @IsString()
  photo: string;

  @ValidateNested()
  @Type(() => PartyDto)
  party: PartyDto;

  @IsBoolean()
  isWinner: boolean;

  @IsBoolean()
  isTied: boolean;
}

export class ResultDto {
  @IsString()
  candidateId: string;

  @IsNumber()
  votes: number;

  @IsNumber()
  percentage: number;
}

export class TotalsDto {
  @IsNumber()
  inscrits: number;

  @IsNumber()
  inscritsHommes: number;

  @IsNumber()
  inscritsFemmes: number;

  @IsNumber()
  votants: number;

  @IsNumber()
  votantsHommes: number;

  @IsNumber()
  votantsFemmes: number;

  @IsNumber()
  exprimes: number;

  @IsNumber()
  blancs: number;

  @IsNumber()
  nuls: number;

  @IsNumber()
  tauxParticipation: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultDto)
  results: ResultDto[];
}

export class TrendDto {
  @IsString()
  candidateId: string;

  @IsString()
  trend: string;

  @IsNumber()
  variation: number;
}

export class StatisticsDto {
  @IsNumber()
  bureauTraites: number;

  @IsNumber()
  bureauTotal: number;

  @IsNumber()
  pourcentageTraite: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrendDto)
  tendances: TrendDto[];
}

export class BureauDto {
  @IsString()
  id: string;

  @IsString()
  numero: string;

  @IsString()
  nom: string;

  @IsString()
  lieuVoteId: string;

  @IsNumber()
  inscrits: number;

  @IsNumber()
  inscritsHommes: number;

  @IsNumber()
  inscritsFemmes: number;

  @IsNumber()
  votants: number;

  @IsNumber()
  votantsHommes: number;

  @IsNumber()
  votantsFemmes: number;

  @IsNumber()
  exprimes: number;

  @IsNumber()
  blancs: number;

  @IsNumber()
  nuls: number;

  @IsNumber()
  tauxParticipation: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultDto)
  results: ResultDto[];
}

export class LieuVoteDto {
  @IsString()
  id: string;

  @IsString()
  nom: string;

  @IsString()
  adresse: string;

  @IsString()
  departementId: string;

  @ValidateNested()
  @Type(() => TotalsDto)
  totals: TotalsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BureauDto)
  bureaux: BureauDto[];
}

export class DepartementDto {
  @IsString()
  id: string;

  @IsString()
  code: string;

  @IsString()
  nom: string;

  @IsString()
  regionId: string;

  @ValidateNested()
  @Type(() => TotalsDto)
  totals: TotalsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LieuVoteDto)
  lieuxVote: LieuVoteDto[];
}

export class RegionDto {
  @IsString()
  id: string;

  @IsString()
  nom: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartementDto)
  departements: DepartementDto[];

  @ValidateNested()
  @Type(() => TotalsDto)
  totals: TotalsDto;
}

export class ElectionResultsDto {
  @IsString()
  id: string;

  @IsString()
  nom: string;

  @IsDateString()
  date: string;

  @IsString()
  type: string;

  @IsNumber()
  tour: number;

  @IsString()
  status: string;

  @IsDateString()
  lastUpdate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateDto)
  candidates: CandidateDto[];

  @ValidateNested()
  @Type(() => TotalsDto)
  totals: TotalsDto;

  @ValidateNested()
  @Type(() => StatisticsDto)
  statistics: StatisticsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegionDto)
  regions: RegionDto[];

  @IsArray()
  @IsString({ each: true })
  departementsPublies: string[];
}

export class ElectionResultsResponseDto {
  @IsBoolean()
  success: boolean;

  @ValidateNested()
  @Type(() => ElectionResultsDto)
  data: ElectionResultsDto;

  @IsString()
  message: string;
}

export class ElectionResultsQueryDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  departementId?: string;

  @IsOptional()
  @IsBoolean()
  includeStatistics?: boolean;
}
