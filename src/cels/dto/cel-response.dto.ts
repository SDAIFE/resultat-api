export class CelResponseDto {
  id: string;
  codeCellule: string;
  typeCellule?: string;
  ligneDebutCellule?: number;
  etatResultatCellule?: string;
  nombreBureauxVote?: number;
  libelleCellule: string;
  utilisateur?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  lieuxVote: {
    id: string;
    codeLieuVote: string;
    libelleLieuVote: string;
    codeCommune: string;
    libelleCommune: string;
  }[];
  statistiques: {
    totalLieuxVote: number;
    totalBureauxVote: number;
    totalInscrits: number;
    totalVotants: number;
    tauxParticipation: number;
  };
}

export class CelListResponseDto {
  cels: CelResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CelStatsDto {
  totalCels: number;
  celsAvecUtilisateur: number;
  celsSansUtilisateur: number;
  celsParType: Record<string, number>;
  totalLieuxVote: number;
  totalBureauxVote: number;
  totalInscrits: number;
  totalVotants: number;
  tauxParticipationGlobal: number;
}

export class CelAssignUserDto {
  userId: string;
}

export class CelUpdateDto {
  typeCellule?: string;
  ligneDebutCellule?: number;
  etatResultatCellule?: string;
  nombreBureauxVote?: number;
  libelleCellule?: string;
}
