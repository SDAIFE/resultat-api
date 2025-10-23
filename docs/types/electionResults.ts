// types/electionResults.ts
// Types TypeScript pour l'API Résultats Électoraux

export interface ElectionResultsQuery {
  level?: 'national' | 'regional' | 'departemental' | 'bureau';
  regionId?: string;
  departementId?: string;
  includeStatistics?: boolean;
}

export interface ElectionResultsResponse {
  success: boolean;
  data: ElectionResultsData;
  message: string;
}

export interface ElectionResultsData {
  id: string;
  nom: string;
  date: string;
  type: string;
  tour: number;
  status: string;
  lastUpdate: string;
  candidates: Candidate[];
  totals: Totals;
  statistics: Statistics;
  regions: Region[];
  departementsPublies: string[];
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  numero: number;
  photo: string;
  party: Party;
  isWinner: boolean;
  isTied: boolean;
}

export interface Party {
  id: string;
  name: string;
  sigle: string;
  logo: string;
  color: string;
}

export interface Totals {
  inscrits: number;
  inscritsHommes: number;
  inscritsFemmes: number;
  votants: number;
  votantsHommes: number;
  votantsFemmes: number;
  exprimes: number;
  blancs: number;
  nuls: number;
  tauxParticipation: number;
  results: Result[];
}

export interface Result {
  candidateId: string;
  votes: number;
  percentage: number;
}

export interface Statistics {
  bureauTraites: number;
  bureauTotal: number;
  pourcentageTraite: number;
  tendances: Trend[];
}

export interface Trend {
  candidateId: string;
  trend: string;
  variation: number;
}

export interface Region {
  id: string;
  nom: string;
  departements: Departement[];
  totals: Totals;
}

export interface Departement {
  id: string;
  code: string;
  nom: string;
  regionId: string;
  totals: Totals;
  lieuxVote: LieuVote[];
}

export interface LieuVote {
  id: string;
  nom: string;
  adresse: string;
  departementId: string;
  totals: Totals;
  bureaux: Bureau[];
}

export interface Bureau {
  id: string;
  numero: string;
  nom: string;
  lieuVoteId: string;
  inscrits: number;
  inscritsHommes: number;
  inscritsFemmes: number;
  votants: number;
  votantsHommes: number;
  votantsFemmes: number;
  exprimes: number;
  blancs: number;
  nuls: number;
  tauxParticipation: number;
  results: Result[];
}

// Types pour les réponses des endpoints supplémentaires
export interface ElectionResultsSummaryResponse {
  success: boolean;
  data: {
    id: string;
    nom: string;
    status: string;
    lastUpdate: string;
    totals: {
      inscrits: number;
      votants: number;
      tauxParticipation: number;
    };
    candidates: Array<{
      id: string;
      fullName: string;
      numero: number;
      isWinner: boolean;
    }>;
  };
  message: string;
}

export interface ElectionCandidatesResponse {
  success: boolean;
  data: Candidate[];
  message: string;
}

// Types pour les erreurs
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Types pour les hooks
export interface UseElectionResultsReturn {
  data: ElectionResultsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Types pour les composants
export interface ElectionResultsProps {
  electionId: string;
  token: string;
  query?: ElectionResultsQuery;
  onError?: (error: string) => void;
  onSuccess?: (data: ElectionResultsResponse) => void;
}

export interface CandidateCardProps {
  candidate: Candidate;
  showResults?: boolean;
  onClick?: (candidate: Candidate) => void;
}

export interface StatisticsDisplayProps {
  statistics: Statistics;
  title?: string;
}

export interface TotalsDisplayProps {
  totals: Totals;
  title?: string;
  showDetails?: boolean;
}

// Types pour le cache
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Types pour la configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheDuration: number;
}

// Types pour les filtres
export interface ElectionFilters {
  level?: 'national' | 'regional' | 'departemental' | 'bureau';
  regionId?: string;
  departementId?: string;
  includeStatistics?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// Types pour les événements
export interface ElectionResultsEvent {
  type: 'LOADING' | 'SUCCESS' | 'ERROR' | 'CLEAR';
  payload?: any;
}

// Types pour les actions Redux (si utilisé)
export interface ElectionResultsState {
  data: ElectionResultsResponse | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  cache: Map<string, CacheEntry<ElectionResultsResponse>>;
}

export interface ElectionResultsAction {
  type: string;
  payload?: any;
}

// Types utilitaires
export type ElectionLevel = 'national' | 'regional' | 'departemental' | 'bureau';
export type ElectionStatus = 'preliminaires' | 'definitifs' | 'provisoires';
export type ElectionType = 'presidential' | 'legislative' | 'municipale';

// Types pour les constantes
export const ELECTION_LEVELS: ElectionLevel[] = ['national', 'regional', 'departemental', 'bureau'];
export const ELECTION_STATUSES: ElectionStatus[] = ['preliminaires', 'definitifs', 'provisoires'];
export const ELECTION_TYPES: ElectionType[] = ['presidential', 'legislative', 'municipale'];

// Types pour les couleurs des partis (exemple)
export const PARTY_COLORS: Record<string, string> = {
  'rhdp': '#FF6B35',
  'fpi': '#1E3A8A',
  'pdci': '#059669',
  'udci': '#DC2626',
  'independant': '#6B7280'
};

// Types pour la validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateElectionId = (electionId: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!electionId || electionId.trim() === '') {
    errors.push('L\'identifiant de l\'élection est requis');
  }
  
  if (electionId && !/^[a-zA-Z0-9-_]+$/.test(electionId)) {
    errors.push('L\'identifiant de l\'élection contient des caractères invalides');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateElectionQuery = (query: ElectionResultsQuery): ValidationResult => {
  const errors: string[] = [];
  
  if (query.level && !ELECTION_LEVELS.includes(query.level)) {
    errors.push('Le niveau doit être l\'un des suivants: national, regional, departemental, bureau');
  }
  
  if (query.includeStatistics !== undefined && typeof query.includeStatistics !== 'boolean') {
    errors.push('includeStatistics doit être un booléen');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
