# Guide Frontend : Gestion des Communes d'Abidjan

## 🎯 Vue d'ensemble

Ce guide explique comment le frontend doit gérer les communes d'Abidjan dans l'interface de publication des résultats.

## 🔄 Changement principal

**AVANT** : La liste de publication affichait 112 départements, incluant "Abidjan" comme un seul élément.

**MAINTENANT** : La liste affiche **125 entités** :
- 111 départements (tous sauf Abidjan)
- 14 communes d'Abidjan (affichées individuellement)

## 📊 Structure des données

### Type d'entité retourné : `PublishableEntity`

```typescript
interface PublishableEntity {
  id: string;                    // ID unique de l'entité
  code: string;                  // "001" pour département, "022-004" pour commune
  libelle: string;               // "AGBOVILLE" ou "ABIDJAN - COCODY"
  type: 'DEPARTMENT' | 'COMMUNE'; // Type d'entité
  totalCels: number;             // Nombre total de CELs
  importedCels: number;          // CELs déjà importées
  pendingCels: number;           // CELs en attente
  publicationStatus: 'PUBLISHED' | 'CANCELLED' | 'PENDING';
  lastUpdate: string;            // ISO date
  cels: CelData[];               // Liste des CELs
  
  // Champs optionnels (uniquement pour les communes)
  codeDepartement?: string;      // "022" pour les communes d'Abidjan
  codeCommune?: string;          // Ex: "004" pour COCODY
}
```

## 🎨 Affichage dans l'interface

### 1. Liste des entités publiables

```typescript
// Appel API
const response = await fetch('/api/publications/departments?page=1&limit=10');
const data = await response.json();

// data.entities contient un mix de départements et communes
data.entities.forEach(entity => {
  if (entity.type === 'DEPARTMENT') {
    // Afficher comme avant : "AGBOVILLE"
    console.log(`📍 ${entity.libelle}`);
  } else if (entity.type === 'COMMUNE') {
    // Afficher avec icône différente : "ABIDJAN - COCODY"
    console.log(`🏙️ ${entity.libelle}`);
  }
});
```

### 2. Tri et regroupement

Les communes d'Abidjan apparaissent **mélangées alphabétiquement** avec les départements :

```
ABENGOUROU (département)
ABIDJAN - ABOBO (commune) ←
ABIDJAN - ADJAME (commune) ←
ABIDJAN - ANYAMA (commune) ←
...
ABIDJAN - YOPOUGON (commune) ←
ABOISSO (département)
ADZOPE (département)
...
```

**Option UI** : Vous pouvez regrouper visuellement toutes les communes d'Abidjan sous une section expandable.

### 3. Actions de publication

#### Pour un département standard

```typescript
const publishDepartment = async (departmentId: string) => {
  const response = await fetch(
    `/api/publications/departments/${departmentId}/publish`,
    { method: 'POST' }
  );
  
  if (response.ok) {
    // Succès
    const result = await response.json();
    console.log(result.message); // "Département XXX publié avec succès"
  } else {
    // Erreur
  }
};
```

#### Pour une commune d'Abidjan

```typescript
const publishCommune = async (communeId: string) => {
  const response = await fetch(
    `/api/publications/communes/${communeId}/publish`,  // ⚠️ Endpoint différent
    { method: 'POST' }
  );
  
  if (response.ok) {
    // Succès
    const result = await response.json();
    console.log(result.message); // "Commune COCODY (Abidjan) publiée avec succès"
  } else {
    // Erreur (ex: CELs non importées)
  }
};
```

#### Logique unifiée dans un composant

```typescript
const publishEntity = async (entity: PublishableEntity) => {
  const endpoint = entity.type === 'DEPARTMENT'
    ? `/api/publications/departments/${entity.id}/publish`
    : `/api/publications/communes/${entity.id}/publish`;
  
  const response = await fetch(endpoint, { method: 'POST' });
  
  if (response.ok) {
    const result = await response.json();
    toast.success(result.message);
  } else {
    const error = await response.json();
    toast.error(error.message);
  }
};
```

## 🔐 Permissions et affichage

### Rôle SADMIN et ADMIN
```typescript
// Récupérer toutes les entités
GET /api/publications/departments?page=1&limit=150

// Résultat : 125 entités (111 départements + 14 communes)
```

### Rôle USER

Un utilisateur peut être assigné à :
- Des **départements** (via `TBL_DEPT.NUM_UTIL`)
- Des **communes d'Abidjan** (via `TBL_COM.NUM_UTIL`)

```typescript
// L'utilisateur ne verra que ses entités assignées
GET /api/publications/departments?page=1&limit=50

// Exemple de résultat pour un USER assigné à COCODY et BOUAKE :
{
  "entities": [
    {
      "type": "COMMUNE",
      "libelle": "ABIDJAN - COCODY",
      ...
    },
    {
      "type": "DEPARTMENT",
      "libelle": "BOUAKE",
      ...
    }
  ]
}
```

## 📱 Exemples d'UI

### Composant Liste (React/Next.js)

```tsx
import { PublishableEntity } from '@/types/publication';

interface EntityListProps {
  entities: PublishableEntity[];
}

export const EntityList = ({ entities }: EntityListProps) => {
  return (
    <div className="entity-list">
      {entities.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  );
};

const EntityCard = ({ entity }: { entity: PublishableEntity }) => {
  const icon = entity.type === 'DEPARTMENT' ? '📍' : '🏙️';
  const bgColor = entity.type === 'COMMUNE' 
    ? 'bg-blue-50 border-blue-200' 
    : 'bg-gray-50 border-gray-200';
  
  return (
    <div className={`p-4 border rounded ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            {icon} {entity.libelle}
          </h3>
          <p className="text-sm text-gray-600">
            {entity.totalCels} CELs ({entity.importedCels} importées, {entity.pendingCels} en attente)
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Bouton publier */}
          <button
            onClick={() => handlePublish(entity)}
            disabled={entity.pendingCels > 0}
            className="btn-primary"
          >
            Publier
          </button>
          
          {/* Badge statut */}
          <StatusBadge status={entity.publicationStatus} />
        </div>
      </div>
    </div>
  );
};

const handlePublish = async (entity: PublishableEntity) => {
  const endpoint = entity.type === 'DEPARTMENT'
    ? `/api/publications/departments/${entity.id}/publish`
    : `/api/publications/communes/${entity.id}/publish`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      toast.success(result.message);
      // Rafraîchir la liste
      refetch();
    } else {
      const error = await response.json();
      toast.error(error.message);
    }
  } catch (error) {
    toast.error('Erreur lors de la publication');
  }
};
```

## 🎨 Option UI : Regrouper les communes d'Abidjan

Si vous voulez regrouper visuellement les communes d'Abidjan :

```tsx
const EntityListGrouped = ({ entities }: EntityListProps) => {
  // Séparer départements et communes
  const departments = entities.filter(e => e.type === 'DEPARTMENT');
  const communesAbidjan = entities.filter(e => e.type === 'COMMUNE');
  
  return (
    <div>
      {/* Section Abidjan (si communes présentes) */}
      {communesAbidjan.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">
            🏙️ Abidjan ({communesAbidjan.length} communes)
          </h2>
          <div className="grid grid-cols-1 gap-3 ml-4">
            {communesAbidjan.map(commune => (
              <EntityCard key={commune.id} entity={commune} />
            ))}
          </div>
        </div>
      )}
      
      {/* Section Départements */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          📍 Départements ({departments.length})
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {departments.map(dept => (
            <EntityCard key={dept.id} entity={dept} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 🔍 Filtres

### Filtrer uniquement les communes d'Abidjan

```typescript
GET /api/publications/departments?codeDepartement=022

// Retour : 14 communes d'Abidjan uniquement
```

### Filtrer par statut de publication

```typescript
GET /api/publications/departments?publicationStatus=PUBLISHED

// Retour : Tous les départements + communes avec statut PUBLISHED
```

### Recherche

```typescript
GET /api/publications/departments?search=COCODY

// Retour : La commune "ABIDJAN - COCODY"
```

## 📋 Composant détails d'une entité

```tsx
const EntityDetails = ({ entityId, entityType }: { 
  entityId: string; 
  entityType: 'DEPARTMENT' | 'COMMUNE' 
}) => {
  const [details, setDetails] = useState(null);
  
  useEffect(() => {
    const endpoint = entityType === 'DEPARTMENT'
      ? `/api/publications/departments/${entityId}/details`
      : `/api/publications/communes/${entityId}/details`;
    
    fetch(endpoint)
      .then(res => res.json())
      .then(data => setDetails(data));
  }, [entityId, entityType]);
  
  if (!details) return <Loader />;
  
  const entity = entityType === 'DEPARTMENT' 
    ? details.department 
    : details.commune;
  
  return (
    <div>
      <h2>{entity.libelleDepartement || entity.libelleCommune}</h2>
      
      {/* Liste des CELs */}
      <div>
        <h3>CELs ({details.cels.length})</h3>
        {details.cels.map(cel => (
          <CelCard key={cel.codeCellule} cel={cel} />
        ))}
      </div>
      
      {/* Historique */}
      <div>
        <h3>Historique ({details.history.length})</h3>
        {details.history.map((h, i) => (
          <div key={i}>
            <span>{h.action}</span> - 
            <span>{h.user}</span> - 
            <span>{new Date(h.timestamp).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## ⚠️ Gestion des erreurs

### Tentative de publier Abidjan globalement

Si l'utilisateur tente de publier le département Abidjan au lieu d'une commune :

```typescript
// Erreur 400 BadRequest
{
  "statusCode": 400,
  "message": "Abidjan ne peut pas être publié globalement. Veuillez publier chaque commune individuellement via les endpoints /communes/:id/publish",
  "error": "Bad Request"
}
```

**UI recommandée** : 
- Ne pas afficher le département Abidjan dans la liste (déjà fait par l'API)
- Afficher uniquement les 14 communes d'Abidjan
- Ajouter une info-bulle : "Pour Abidjan, publiez chaque commune individuellement"

### Commune avec CELs non importées

```typescript
// Erreur 400 BadRequest
{
  "statusCode": 400,
  "message": "Impossible de publier la commune COCODY. 3 CEL(s) ne sont pas encore importées.",
  "error": "Bad Request"
}
```

**UI recommandée** :
- Désactiver le bouton "Publier" si `entity.pendingCels > 0`
- Afficher un message : "X CEL(s) en attente d'import"

## 🎨 Exemple d'interface complète

```tsx
'use client';

import { useState, useEffect } from 'react';
import { PublishableEntity } from '@/types/publication';

export default function PublicationPage() {
  const [entities, setEntities] = useState<PublishableEntity[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<{
    search?: string;
    status?: 'PUBLISHED' | 'CANCELLED' | 'PENDING';
  }>({});

  // Récupérer les entités
  const fetchEntities = async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...(filter.search && { search: filter.search }),
      ...(filter.status && { publicationStatus: filter.status })
    });

    const response = await fetch(`/api/publications/departments?${params}`);
    const data = await response.json();
    
    setEntities(data.entities);
    setTotal(data.total);
  };

  useEffect(() => {
    fetchEntities();
  }, [page, filter]);

  // Publier une entité
  const handlePublish = async (entity: PublishableEntity) => {
    if (entity.pendingCels > 0) {
      alert(`Impossible de publier : ${entity.pendingCels} CEL(s) non importées`);
      return;
    }

    const endpoint = entity.type === 'DEPARTMENT'
      ? `/api/publications/departments/${entity.id}/publish`
      : `/api/publications/communes/${entity.id}/publish`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        fetchEntities(); // Rafraîchir
      } else {
        const error = await response.json();
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('Erreur lors de la publication');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Publication des Résultats</h1>

      {/* Filtres */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Rechercher..."
          value={filter.search || ''}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="border p-2 rounded"
        />
        
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
          className="border p-2 rounded"
        >
          <option value="">Tous les statuts</option>
          <option value="PUBLISHED">Publiés</option>
          <option value="PENDING">En attente</option>
          <option value="CANCELLED">Annulés</option>
        </select>
      </div>

      {/* Liste des entités */}
      <div className="space-y-3">
        {entities.map(entity => (
          <div 
            key={entity.id}
            className={`p-4 border rounded ${
              entity.type === 'COMMUNE' 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {entity.type === 'DEPARTMENT' ? '📍' : '🏙️'} {entity.libelle}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {entity.totalCels} CELs 
                  ({entity.importedCels} importées, 
                  {entity.pendingCels} en attente)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Badge statut */}
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  entity.publicationStatus === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800'
                    : entity.publicationStatus === 'CANCELLED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {entity.publicationStatus === 'PUBLISHED' && 'Publié'}
                  {entity.publicationStatus === 'CANCELLED' && 'Annulé'}
                  {entity.publicationStatus === 'PENDING' && 'En attente'}
                </span>

                {/* Boutons d'action */}
                {entity.publicationStatus !== 'PUBLISHED' && (
                  <button
                    onClick={() => handlePublish(entity)}
                    disabled={entity.pendingCels > 0}
                    className={`px-4 py-2 rounded ${
                      entity.pendingCels > 0
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Publier
                  </button>
                )}

                {entity.publicationStatus === 'PUBLISHED' && (
                  <button
                    onClick={() => handleCancel(entity)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded"
        >
          Précédent
        </button>
        <span className="px-4 py-2">
          Page {page} / {Math.ceil(total / 20)}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= Math.ceil(total / 20)}
          className="px-4 py-2 border rounded"
        >
          Suivant
        </button>
      </div>
    </div>
  );
};
```

## 🔍 Détails d'une entité

### Modal/Page de détails

```tsx
const EntityDetailsModal = ({ entityId, entityType }: { 
  entityId: string; 
  entityType: 'DEPARTMENT' | 'COMMUNE' 
}) => {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const endpoint = entityType === 'DEPARTMENT'
      ? `/api/publications/departments/${entityId}/details`
      : `/api/publications/communes/${entityId}/details`;

    fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDetails(data));
  }, [entityId, entityType]);

  if (!details) return <Spinner />;

  const entity = entityType === 'DEPARTMENT' 
    ? details.department 
    : details.commune;

  return (
    <div className="modal">
      <h2>{entity.libelleDepartement || entity.libelleCommune}</h2>
      
      {/* Statistiques */}
      <div className="stats-grid">
        <StatCard label="Total CELs" value={entity.totalCels} />
        <StatCard label="CELs importées" value={entity.importedCels} />
        <StatCard label="CELs en attente" value={entity.pendingCels} />
        <StatCard label="Statut" value={entity.publicationStatus} />
      </div>

      {/* Liste des CELs */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">
          Liste des CELs ({details.cels.length})
        </h3>
        <table className="w-full">
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th>Statut</th>
              <th>Lignes importées</th>
            </tr>
          </thead>
          <tbody>
            {details.cels.map(cel => (
              <tr key={cel.codeCellule}>
                <td>{cel.codeCellule}</td>
                <td>{cel.libelleCellule}</td>
                <td>
                  <StatusBadge status={cel.statut} />
                </td>
                <td>{cel.nombreLignesImportees}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historique */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">
          Historique ({details.history.length})
        </h3>
        <div className="space-y-2">
          {details.history.map((h, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between">
                <span className="font-medium">{h.action}</span>
                <span className="text-sm text-gray-600">
                  {new Date(h.timestamp).toLocaleString('fr-FR')}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                Par : {h.user}
              </p>
              {h.details && (
                <p className="text-sm text-gray-600 mt-1">{h.details}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 📡 Endpoints disponibles

### Liste et statistiques
```typescript
GET /api/publications/stats
GET /api/publications/departments?page=1&limit=10
GET /api/publications/departments?codeDepartement=022  // Communes Abidjan
GET /api/publications/departments?search=COCODY
GET /api/publications/departments?publicationStatus=PUBLISHED
```

### Départements
```typescript
POST /api/publications/departments/:id/publish
POST /api/publications/departments/:id/cancel
GET /api/publications/departments/:id/details
GET /api/publications/departments/:codeDepartement/data
```

### Communes (Abidjan uniquement)
```typescript
POST /api/publications/communes/:id/publish
POST /api/publications/communes/:id/cancel
GET /api/publications/communes/:id/details
```

## 🎨 Recommandations UX

1. **Distinction visuelle** : 
   - Icône 📍 pour départements
   - Icône 🏙️ pour communes d'Abidjan
   - Couleur de fond différente

2. **Information claire** :
   - Afficher "ABIDJAN - [COMMUNE]" pour les communes
   - Indiquer le nombre de CELs en attente avant de permettre la publication

3. **Feedback utilisateur** :
   - Toast/notification de succès après publication
   - Message d'erreur clair si CELs manquantes

4. **Performance** :
   - Paginer la liste (20-50 entités par page)
   - Utiliser le filtre `codeDepartement=022` pour afficher uniquement Abidjan

5. **Responsive** :
   - Sur mobile : Afficher les communes en liste verticale
   - Sur desktop : Possibilité de grille 2-3 colonnes

## 🔐 Permissions

### SADMIN et ADMIN
- ✅ Voient toutes les 125 entités
- ✅ Peuvent publier/annuler départements et communes

### USER
- ✅ Voient uniquement leurs entités assignées
- ✅ Peuvent voir l'état mais pas publier (selon vos besoins)

---

**Date** : 2025-10-09  
**Version** : 1.0.0

