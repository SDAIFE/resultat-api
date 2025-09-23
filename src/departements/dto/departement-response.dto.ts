export class DepartementResponseDto {
  id: string;
  codeDepartement: string;
  codeRegion: string;
  libelleDepartement: string;
  statutPublication?: string;
  region: {
    id: string;
    codeRegion: string;
    libelleRegion: string;
  };
  utilisateur?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  sousPrefectures: {
    id: string;
    codeSousPrefecture: string;
    libelleSousPrefecture: string;
  }[];
  communes: {
    id: string;
    codeCommune: string;
    libelleCommune: string;
  }[];
  lieuxVote: {
    id: string;
    codeLieuVote: string;
    libelleLieuVote: string;
  }[];
  bureauxVote: {
    id: string;
    numeroBureauVote: string;
    inscrits?: number;
    totalVotants?: number;
  }[];
}

export class DepartementListResponseDto {
  departements: DepartementResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class DepartementStatsDto {
  totalDepartements: number;
  departementsAvecUtilisateur: number;
  departementsSansUtilisateur: number;
  totalSousPrefectures: number;
  totalCommunes: number;
  totalLieuxVote: number;
  totalBureauxVote: number;
}
