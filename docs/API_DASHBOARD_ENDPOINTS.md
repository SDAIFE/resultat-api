# API Dashboard - Endpoints selon les Directives

## 🎯 Vue d'ensemble

Ce document décrit les endpoints du dashboard implémentés selon les directives fournies. Tous les endpoints sont sécurisés par authentification JWT et contrôlés par rôles.

## 🔐 Sécurité

- **Authentification** : JWT Token requis
- **Autorisation** : Contrôle par rôles (USER, ADMIN, SADMIN)
- **Filtrage des données** : Automatique selon le rôle de l'utilisateur

## 📊 Endpoints Principaux

### 1. `GET /api/dashboard/metrics`
**Description** : Endpoint principal qui retourne les métriques selon le rôle de l'utilisateur

**Accès** : Tous les rôles authentifiés

**Réponse** : 
- `USER` → `UserDashboardStatsDto`
- `ADMIN` → `AdminDashboardStatsDto` 
- `SADMIN` → `SadminDashboardStatsDto`

**Exemple de réponse USER** :
```json
{
  "totalCels": 150,
  "celsAvecImport": 120,
  "celsSansImport": 30,
  "tauxProgression": 80.0,
  "celsParStatut": {
    "pending": 25,
    "imported": 120,
    "error": 5,
    "processing": 0
  },
  "nombreErreurs": 5,
  "alertes": {
    "celsSansImport": 30,
    "celsEnErreur": 5,
    "celsEnAttente": 25
  },
  "celsAssignees": 150,
  "celsAvecImportAssignees": 120,
  "celsSansImportAssignees": 30,
  "tauxProgressionPersonnel": 80.0
}
```

### 2. `GET /api/dashboard/user-metrics`
**Description** : Métriques spécifiques pour les utilisateurs USER (données restreintes)

**Accès** : Rôle `USER` uniquement

**Réponse** : `UserDashboardStatsDto`

**Données incluses** :
- CELs assignées à l'utilisateur uniquement
- Statistiques personnelles
- Progression individuelle

### 3. `GET /api/dashboard/admin-metrics`
**Description** : Métriques pour les administrateurs (données complètes)

**Accès** : Rôles `ADMIN` et `SADMIN`

**Réponse** : 
- `ADMIN` → `AdminDashboardStatsDto`
- `SADMIN` → `SadminDashboardStatsDto`

**Données incluses** :
- Toutes les CELs des départements assignés (ADMIN)
- Toutes les CELs du système (SADMIN)
- Statistiques par département/région
- Utilisateurs actifs

### 4. `GET /api/dashboard/realtime-metrics`
**Description** : Métriques en temps réel (optimisées pour mises à jour fréquentes)

**Accès** : Tous les rôles authentifiés

**Réponse** : `RealtimeMetricsDto`

**Données incluses** :
- Métriques de base selon le rôle
- Activité récente (24h)
- Imports en cours
- Alertes critiques
- Timestamp de dernière mise à jour

**Exemple de réponse** :
```json
{
  "totalCels": 150,
  "celsAvecImport": 120,
  "celsSansImport": 30,
  "tauxProgression": 80.0,
  "celsParStatut": {
    "pending": 25,
    "imported": 120,
    "error": 5,
    "processing": 0
  },
  "nombreErreurs": 5,
  "alertes": {
    "celsSansImport": 30,
    "celsEnErreur": 5,
    "celsEnAttente": 25
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "activiteRecente": {
    "importsAujourdhui": 5,
    "publicationsAujourdhui": 2,
    "connexionsAujourdhui": 0
  },
  "importsEnCours": {
    "nombre": 2,
    "liste": [
      {
        "codeCellule": "CEL001",
        "nomFichier": "resultats_cel001.xlsx",
        "dateImport": "2025-01-27T10:25:00.000Z",
        "utilisateur": {
          "id": "user123",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ]
  },
  "alertesCritiques": {
    "celsEnErreurCritique": 3,
    "importsBloques": 1,
    "utilisateursInactifs": 0,
    "departementsNonPublies": 2
  }
}
```

### 5. `POST /api/dashboard/refresh-metrics`
**Description** : Rafraîchissement forcé des métriques (invalidation du cache)

**Accès** : Tous les rôles authentifiés

**Réponse** : `RefreshMetricsResponseDto`

**Exemple de réponse** :
```json
{
  "success": true,
  "message": "Métriques rafraîchies avec succès",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## 🔒 Logique de Sécurité par Rôle

### USER (Utilisateur Standard)
- **Accès** : Données de l'utilisateur uniquement
- **Filtrage** : `numeroUtilisateur = userId`
- **Endpoints disponibles** : Tous sauf restrictions spécifiques

### ADMIN (Administrateur)
- **Accès** : Départements assignés + leurs CELs
- **Filtrage** : Départements avec `numeroUtilisateur = userId`
- **Endpoints disponibles** : Tous

### SADMIN (Super Administrateur)
- **Accès** : Toutes les données du système
- **Filtrage** : Aucun (accès complet)
- **Endpoints disponibles** : Tous

## 📈 Endpoints CELs Existants

Les endpoints suivants étaient déjà implémentés et restent disponibles :

- `GET /api/dashboard/cels` - Liste des CELs avec filtres
- `GET /api/dashboard/cels/my-cels` - CELs de l'utilisateur (USER)
- `GET /api/dashboard/cels/department-cels` - CELs des départements (ADMIN)
- `GET /api/dashboard/cels/all-cels` - Toutes les CELs (SADMIN)
- `GET /api/dashboard/cels/status/:status` - CELs par statut
- `GET /api/dashboard/cels/pending-imports` - CELs en attente d'import
- `GET /api/dashboard/cels/completed-imports` - CELs importées avec succès
- `GET /api/dashboard/cels/error-imports` - CELs en erreur

## 🚨 Gestion des Erreurs

### Codes d'erreur
- `401` : Non authentifié
- `403` : Accès refusé (rôle insuffisant)
- `404` : Données non trouvées
- `500` : Erreur serveur

### Réponses d'erreur
```json
{
  "success": false,
  "error": {
    "code": "DASHBOARD_FORBIDDEN",
    "message": "Accès refusé pour ce rôle"
  }
}
```

## 🔧 Utilisation Frontend

### Récupération des métriques de base
```typescript
// Métriques selon le rôle
const metrics = await fetch('/api/dashboard/metrics', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Métriques temps réel (pour les widgets live)
const realtimeMetrics = await fetch('/api/dashboard/realtime-metrics', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Rafraîchissement manuel
```typescript
// Forcer le rafraîchissement
const refresh = await fetch('/api/dashboard/refresh-metrics', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 📝 Notes d'implémentation

1. **Performance** : Les métriques temps réel sont optimisées pour des appels fréquents
2. **Cache** : Prêt pour l'intégration Redis (méthode `refreshMetrics`)
3. **Sécurité** : Filtrage automatique selon les rôles
4. **Extensibilité** : Structure modulaire pour ajouter de nouvelles métriques

## 🔄 Prochaines étapes recommandées

1. **Cache Redis** : Implémenter le cache avec TTL de 5 minutes
2. **Rate Limiting** : Limiter à 100 req/min par utilisateur
3. **Monitoring** : Ajouter des logs structurés et métriques Prometheus
4. **Tests** : Tests unitaires et d'intégration pour tous les endpoints
