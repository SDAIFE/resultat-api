export class RealtimeMetricsDto {
  // Métriques de base (héritées des stats normales)
  totalCels: number;
  celsAvecImport: number;
  celsSansImport: number;
  tauxProgression: number;
  celsParStatut: {
    pending: number;
    imported: number;
    error: number;
    processing: number;
  };
  nombreErreurs: number;
  alertes: {
    celsSansImport: number;
    celsEnErreur: number;
    celsEnAttente: number;
  };

  // Métriques temps réel spécifiques
  timestamp: Date;
  
  // Activité récente (dernières 24h)
  activiteRecente: {
    importsAujourdhui: number;
    publicationsAujourdhui: number;
    connexionsAujourdhui: number;
  };

  // Imports en cours
  importsEnCours: {
    nombre: number;
    liste: Array<{
      codeCellule: string;
      nomFichier: string;
      dateImport: Date;
      utilisateur?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      };
      messageErreur?: string;
    }>;
  };

  // Alertes critiques
  alertesCritiques: {
    celsEnErreurCritique: number;
    importsBloques: number;
    utilisateursInactifs: number;
    departementsNonPublies: number;
  };
}

export class RefreshMetricsResponseDto {
  success: boolean;
  message: string;
  timestamp: Date;
}
