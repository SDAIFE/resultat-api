export class DashboardStatsDto {
  // Statistiques générales
  totalCels: number;
  celsAvecImport: number;
  celsSansImport: number;
  tauxProgression: number;
  
  // Statistiques par statut d'import
  celsParStatut: {
    pending: number;
    imported: number;
    error: number;
    processing: number;
  };
  
  // Métriques de performance
  dernierImport?: Date;
  tempsMoyenImport?: number; // en minutes
  nombreErreurs: number;
  
  // Alertes
  alertes: {
    celsSansImport: number;
    celsEnErreur: number;
    celsEnAttente: number;
  };
}

export class UserDashboardStatsDto extends DashboardStatsDto {
  // Spécifique à l'utilisateur
  celsAssignees: number;
  celsAvecImportAssignees: number;
  celsSansImportAssignees: number;
  tauxProgressionPersonnel: number;
}

export class AdminDashboardStatsDto extends DashboardStatsDto {
  // Métriques communes ADMIN/SADMIN
  totalRegions: number;
  totalDepartements: number;
  totalUtilisateurs: number;
  utilisateursParRole: Array<{
    role: string;
    count: number;
  }>;
  importsParJour: Array<{
    date: string;
    nombreImports: number;
    nombreReussis: number;
    nombreEchoues: number;
  }>;
  
  // Métriques spécifiques ADMIN (départements assignés)
  departementsAssignes: number;
  utilisateursActifs: number;
  celsParDepartement: Array<{
    codeDepartement: string;
    libelleDepartement: string;
    totalCels: number;
    celsAvecImport: number;
    tauxProgression: number;
  }>;
}

// Alias pour maintenir la compatibilité
export class SadminDashboardStatsDto extends AdminDashboardStatsDto {}
