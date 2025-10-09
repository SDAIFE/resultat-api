# API Endpoints : Publication des Résultats (avec Communes Abidjan)

**Version** : 2.0.0  
**Date** : 2025-10-09  
**Base URL** : `/api/publications`

---

## 📊 Statistiques globales

### GET `/stats`

**Description** : Récupère les statistiques globales de publication

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN, USER

**Réponse** :
```json
{
  "totalDepartments": 125,        // 111 depts + 14 communes Abidjan
  "publishedDepartments": 45,
  "pendingDepartments": 80,
  "totalCels": 623,
  "importedCels": 312,
  "pendingCels": 311,
  "publicationRate": 36.0
}
```

**Filtrage par rôle** :
- **SADMIN/ADMIN** : Toutes les entités
- **USER** : Uniquement les départements/communes assignés

---

## 📋 Liste des entités publiables

### GET `/departments`

**Description** : Récupère la liste des départements ET communes d'Abidjan

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN, USER

**Query Parameters** :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `page` | number | Non | Numéro de page (défaut: 1) |
| `limit` | number | Non | Nombre d'éléments par page (défaut: 10) |
| `codeDepartement` | string | Non | Filtrer par code département (ex: "022" pour Abidjan uniquement) |
| `publicationStatus` | enum | Non | PUBLISHED, CANCELLED, PENDING |
| `search` | string | Non | Recherche dans libellé et code |

**Exemples d'appels** :
```http
# Récupérer toutes les entités (page 1)
GET /api/publications/departments?page=1&limit=20

# Récupérer uniquement les communes d'Abidjan
GET /api/publications/departments?codeDepartement=022

# Rechercher COCODY
GET /api/publications/departments?search=COCODY

# Filtrer les entités publiées
GET /api/publications/departments?publicationStatus=PUBLISHED

# Combiner les filtres
GET /api/publications/departments?codeDepartement=022&publicationStatus=PENDING
```

**Réponse** :
```json
{
  "entities": [
    {
      "id": "clx123...",
      "code": "001",
      "libelle": "AGBOVILLE",
      "type": "DEPARTMENT",
      "codeDepartement": "001",
      "totalCels": 11,
      "importedCels": 8,
      "pendingCels": 3,
      "publicationStatus": "PENDING",
      "lastUpdate": "2025-10-09T10:30:00.000Z",
      "cels": [...]
    },
    {
      "id": "clx456...",
      "code": "022-004",
      "libelle": "ABIDJAN - COCODY",
      "type": "COMMUNE",
      "codeDepartement": "022",
      "codeCommune": "004",
      "totalCels": 7,
      "importedCels": 7,
      "pendingCels": 0,
      "publicationStatus": "PUBLISHED",
      "lastUpdate": "2025-10-09T11:15:00.000Z",
      "cels": [...]
    }
  ],
  "total": 125,
  "page": 1,
  "limit": 20,
  "totalPages": 7
}
```

**Notes importantes** :
- Le département Abidjan (022) **n'apparaît PAS** dans la liste
- Les 14 communes d'Abidjan apparaissent avec `type: "COMMUNE"`
- Le tri est alphabétique par `libelle`

---

## 📍 Publication de départements

### POST `/departments/:id/publish`

**Description** : Publier un département (hors Abidjan)

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID du département |

**Validations** :
- ✅ Le département existe
- ✅ Le département n'est pas Abidjan (022) → Erreur 400
- ✅ Toutes les CELs sont importées (statut I ou P) → Sinon erreur 400

**Succès (200)** :
```json
{
  "success": true,
  "message": "Département AGBOVILLE publié avec succès",
  "entity": {
    "id": "clx123...",
    "code": "001",
    "libelle": "AGBOVILLE",
    "type": "DEPARTMENT",
    "publicationStatus": "PUBLISHED",
    ...
  }
}
```

**Erreur - Abidjan (400)** :
```json
{
  "statusCode": 400,
  "message": "Abidjan ne peut pas être publié globalement. Veuillez publier chaque commune individuellement via les endpoints /communes/:id/publish",
  "error": "Bad Request"
}
```

**Erreur - CELs non importées (400)** :
```json
{
  "statusCode": 400,
  "message": "Impossible de publier le département. 3 CEL(s) ne sont pas encore importées.",
  "error": "Bad Request"
}
```

---

### POST `/departments/:id/cancel`

**Description** : Annuler la publication d'un département

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID du département |

**Succès (200)** :
```json
{
  "success": true,
  "message": "Publication du département AGBOVILLE annulée",
  "entity": {
    "publicationStatus": "CANCELLED",
    ...
  }
}
```

---

### GET `/departments/:id/details`

**Description** : Récupérer les détails complets d'un département

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID du département |

**Réponse** :
```json
{
  "department": {
    "id": "clx123...",
    "codeDepartement": "001",
    "libelleDepartement": "AGBOVILLE",
    "totalCels": 11,
    "importedCels": 8,
    "pendingCels": 3,
    "publicationStatus": "PENDING",
    ...
  },
  "cels": [...],
  "history": [
    {
      "action": "PUBLISH",
      "timestamp": "2025-10-09T10:30:00.000Z",
      "user": "Jean Dupont",
      "details": "Département AGBOVILLE publié avec succès"
    }
  ]
}
```

---

## 🏙️ Publication de communes (Abidjan)

### POST `/communes/:id/publish`

**Description** : Publier une commune d'Abidjan

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID de la commune |

**Validations** :
- ✅ La commune existe
- ✅ La commune appartient à Abidjan (codeDepartement = '022') → Sinon erreur 400
- ✅ Toutes les CELs de la commune sont importées → Sinon erreur 400

**Succès (200)** :
```json
{
  "success": true,
  "message": "Commune COCODY (Abidjan) publiée avec succès",
  "entity": {
    "id": "clx456...",
    "code": "022-004",
    "libelle": "ABIDJAN - COCODY",
    "type": "COMMUNE",
    "codeDepartement": "022",
    "codeCommune": "004",
    "totalCels": 7,
    "importedCels": 7,
    "pendingCels": 0,
    "publicationStatus": "PUBLISHED",
    ...
  }
}
```

**Erreur - CELs non importées (400)** :
```json
{
  "statusCode": 400,
  "message": "Impossible de publier la commune COCODY. 2 CEL(s) ne sont pas encore importées.",
  "error": "Bad Request"
}
```

**Erreur - Pas une commune d'Abidjan (400)** :
```json
{
  "statusCode": 400,
  "message": "Cette fonctionnalité est réservée aux communes d'Abidjan",
  "error": "Bad Request"
}
```

---

### POST `/communes/:id/cancel`

**Description** : Annuler la publication d'une commune d'Abidjan

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID de la commune |

**Succès (200)** :
```json
{
  "success": true,
  "message": "Publication de la commune COCODY (Abidjan) annulée",
  "entity": {
    "publicationStatus": "CANCELLED",
    ...
  }
}
```

---

### GET `/communes/:id/details`

**Description** : Récupérer les détails complets d'une commune d'Abidjan

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID de la commune |

**Réponse** :
```json
{
  "commune": {
    "id": "clx456...",
    "codeCommune": "004",
    "codeDepartement": "022",
    "libelleCommune": "COCODY",
    "totalCels": 7,
    "importedCels": 7,
    "pendingCels": 0,
    "publicationStatus": "PUBLISHED",
    "lastUpdate": "2025-10-09T11:15:00.000Z",
    "cels": [
      {
        "codeCellule": "C016",
        "libelleCellule": "CEC COCODY 01",
        "statut": "I",
        "dateImport": "2025-10-09T10:00:00.000Z"
      },
      ...
    ]
  },
  "cels": [...],
  "history": [
    {
      "action": "PUBLISH",
      "timestamp": "2025-10-09T11:15:00.000Z",
      "user": "Marie Martin",
      "details": "Commune COCODY (Abidjan) publiée avec succès"
    }
  ]
}
```

---

## 📊 Données agrégées

### GET `/departments/:codeDepartement/data`

**Description** : Récupérer les données agrégées avec résultats par CEL

**Authentification** : ✅ Requise (JWT)  
**Rôles autorisés** : SADMIN, ADMIN, USER

**Path Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `codeDepartement` | string | Code du département |

**Query Parameters** :
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `page` | number | Non | Numéro de page (défaut: 1) |
| `limit` | number | Non | Nombre d'éléments (défaut: 10) |
| `search` | string | Non | Recherche |

**Exemple** :
```http
GET /api/publications/departments/022/data?page=1&limit=1
```

**Réponse** : Voir `docs/EXEMPLE_RETOUR_getDepartmentsData.md`

**Note** : Pour Abidjan (022), retourne les données agrégées de **toutes les 14 communes**.

---

## 🔄 Flux de publication

### Pour un département standard (ex: BOUAKE)

```mermaid
Utilisateur clique sur "Publier BOUAKE"
    ↓
POST /api/publications/departments/{id}/publish
    ↓
Vérification : Toutes les CELs importées ?
    ↓ OUI
TBL_DEPT.STAT_PUB = 'PUBLISHED'
    ↓
Enregistrement dans DEPARTMENT_PUBLICATION_HISTORY
    ↓
Retour : 200 OK avec message de succès
```

### Pour une commune d'Abidjan (ex: COCODY)

```mermaid
Utilisateur clique sur "Publier COCODY"
    ↓
POST /api/publications/communes/{id}/publish
    ↓
Vérification : C'est bien Abidjan (022) ?
    ↓ OUI
Vérification : Toutes les CELs de COCODY importées ?
    ↓ OUI
TBL_COM.STAT_PUB = 'PUBLISHED'
    ↓
Enregistrement dans COMMUNE_PUBLICATION_HISTORY
    ↓
Retour : 200 OK avec message de succès
```

### Tentative de publier Abidjan globalement ❌

```mermaid
Utilisateur essaie de publier département Abidjan
    ↓
POST /api/publications/departments/{id}/publish
    ↓
Détection : codeDepartement === '022'
    ↓
Retour : 400 Bad Request
Message : "Veuillez publier chaque commune individuellement"
```

---

## 🧪 Exemples de requêtes (cURL)

### Récupérer les statistiques
```bash
curl -X GET "http://localhost:3000/api/publications/stats" \
  -H "Authorization: Bearer {token}"
```

### Récupérer toutes les entités
```bash
curl -X GET "http://localhost:3000/api/publications/departments?page=1&limit=50" \
  -H "Authorization: Bearer {token}"
```

### Récupérer uniquement Abidjan (14 communes)
```bash
curl -X GET "http://localhost:3000/api/publications/departments?codeDepartement=022" \
  -H "Authorization: Bearer {token}"
```

### Publier une commune (COCODY)
```bash
curl -X POST "http://localhost:3000/api/publications/communes/{communeId}/publish" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Annuler publication d'une commune
```bash
curl -X POST "http://localhost:3000/api/publications/communes/{communeId}/cancel" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Obtenir détails d'une commune
```bash
curl -X GET "http://localhost:3000/api/publications/communes/{communeId}/details" \
  -H "Authorization: Bearer {token}"
```

---

## 📦 Types TypeScript pour le Frontend

```typescript
// Types pour les entités publiables
export type EntityType = 'DEPARTMENT' | 'COMMUNE';
export type PublicationStatus = 'PUBLISHED' | 'CANCELLED' | 'PENDING';

export interface CelData {
  codeCellule: string;
  libelleCellule: string;
  statut: 'N' | 'I' | 'P';
  dateImport?: string;
  nombreLignesImportees?: number;
  nombreLignesEnErreur?: number;
}

export interface PublishableEntity {
  id: string;
  code: string;
  libelle: string;
  type: EntityType;
  totalCels: number;
  importedCels: number;
  pendingCels: number;
  publicationStatus: PublicationStatus;
  lastUpdate: string;
  cels: CelData[];
  codeDepartement?: string;
  codeCommune?: string;
}

export interface DepartmentListResponse {
  entities: PublishableEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicationActionResult {
  success: boolean;
  message: string;
  entity?: PublishableEntity;
  error?: string;
}

export interface DepartmentStatsResponse {
  totalDepartments: number;
  publishedDepartments: number;
  pendingDepartments: number;
  totalCels: number;
  importedCels: number;
  pendingCels: number;
  publicationRate: number;
}
```

---

## 🎯 Cas d'usage Frontend

### 1. Afficher la liste de publication

```typescript
const PublicationList = () => {
  const [data, setData] = useState<DepartmentListResponse | null>(null);
  
  useEffect(() => {
    fetch('/api/publications/departments?page=1&limit=50')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  return (
    <div>
      {data?.entities.map(entity => (
        <EntityCard 
          key={entity.id} 
          entity={entity}
          onPublish={handlePublish}
          onCancel={handleCancel}
        />
      ))}
    </div>
  );
};
```

### 2. Publier une entité (département ou commune)

```typescript
const handlePublish = async (entity: PublishableEntity) => {
  const endpoint = entity.type === 'DEPARTMENT'
    ? `/api/publications/departments/${entity.id}/publish`
    : `/api/publications/communes/${entity.id}/publish`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result: PublicationActionResult = await response.json();
      toast.success(result.message);
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

### 3. Filtrer les communes d'Abidjan

```typescript
const AbidjanCommunesList = () => {
  const [communes, setCommunes] = useState<PublishableEntity[]>([]);
  
  useEffect(() => {
    fetch('/api/publications/departments?codeDepartement=022&limit=20')
      .then(res => res.json())
      .then(data => setCommunes(data.entities));
  }, []);

  return (
    <div>
      <h2>Communes d'Abidjan ({communes.length})</h2>
      {communes.map(commune => (
        <CommuneCard key={commune.id} commune={commune} />
      ))}
    </div>
  );
};
```

---

## ⚠️ Points d'attention

1. **Département Abidjan** : N'utilisez JAMAIS `/departments/:id/publish` pour Abidjan → Erreur 400

2. **Type d'entité** : Toujours vérifier `entity.type` pour utiliser le bon endpoint

3. **Validation CELs** : Désactivez le bouton "Publier" si `entity.pendingCels > 0`

4. **Pagination** : La liste contient 125 entités, pensez à paginer (20-50 par page)

5. **Recherche** : La recherche fonctionne sur départements ET communes

6. **Permissions USER** : Un USER ne voit que ses entités assignées (départements ou communes d'Abidjan)

---

## 📚 Documentation complémentaire

- `IMPLEMENTATION_ABIDJAN_COMMUNES.md` - Documentation technique complète
- `GUIDE_FRONTEND_ABIDJAN_COMMUNES.md` - Guide d'intégration frontend
- `EXEMPLE_RETOUR_getDepartmentsData.md` - Exemples de données agrégées

---

**Contact** : Équipe Backend NestJS  
**Dernière mise à jour** : 2025-10-09

