# Questions Backend : Harmonisation Communes d'Abidjan

**Date** : 2025-10-09  
**Contexte** : Mise à jour frontend pour gérer les 14 communes d'Abidjan individuellement

---

## 🎯 Objectif

Vérifier que le backend et le frontend sont bien synchronisés pour l'affichage des **125 entités** (111 départements + 14 communes d'Abidjan).

---

## 📋 Questions pour l'équipe Backend

### 1. Format de la réponse API

**Question** : Quelle est la structure exacte de la réponse de l'endpoint `/api/publications/departments` ?

**Ce que le frontend attend actuellement** :

```typescript
// Option A : Nouveau format (préféré)
{
  "entities": [
    {
      "id": "dept-001",
      "code": "001",
      "libelle": "AGBOVILLE",
      "type": "DEPARTMENT",
      "totalCels": 10,
      "importedCels": 8,
      "pendingCels": 2,
      "publicationStatus": "PENDING",
      "lastUpdate": "2025-10-09T10:00:00Z",
      "cels": [...]
    },
    {
      "id": "commune-022-004",
      "code": "022-004",
      "libelle": "ABIDJAN - COCODY",
      "type": "COMMUNE",
      "totalCels": 5,
      "importedCels": 5,
      "pendingCels": 0,
      "publicationStatus": "PUBLISHED",
      "lastUpdate": "2025-10-09T10:00:00Z",
      "cels": [...],
      "codeDepartement": "022",
      "codeCommune": "004"
    }
  ],
  "total": 125,
  "page": 1,
  "limit": 10,
  "totalPages": 13
}

// OU Option B : Ancien format (le frontend peut le convertir)
{
  "departments": [
    // Même structure que ci-dessus
  ],
  "total": 125,
  "page": 1,
  "limit": 10,
  "totalPages": 13
}
```

**❓ Quelle option utilisez-vous ?**

---

### 2. Distinction départements vs communes

**Question** : Comment différencier une commune d'Abidjan d'un département dans la réponse ?

**Options possibles** :

1. **Champ `type`** : Les entités ont un champ `type: "DEPARTMENT" | "COMMUNE"`
2. **Code spécifique** : Les communes ont un code format "022-XXX" (ex: "022-004")
3. **Champ supplémentaire** : Les communes ont `codeDepartement: "022"` et `codeCommune: "XXX"`
4. **Autre méthode** : _À préciser_

**❓ Quelle méthode utilisez-vous pour distinguer les communes ?**

---

### 3. Libellés des communes

**Question** : Quel est le format exact du libellé pour les communes d'Abidjan ?

**Options** :
- `"ABIDJAN - COCODY"` ✅ (recommandé)
- `"COCODY"` 
- `"COCODY (ABIDJAN)"`
- Autre : _________________

**❓ Quel format utilisez-vous ?**

---

### 4. Exclusion d'Abidjan global

**Question** : Est-ce que le département "ABIDJAN" global (code 022) est **exclu** de la liste ?

**Comportement attendu** :
- ✅ **OUI** : La liste contient 125 entités (111 départements hors Abidjan + 14 communes)
- ❌ **NON** : La liste contient 126 entités (112 départements + 14 communes)

**❓ Abidjan global est-il exclu de la liste ?**

---

### 5. Endpoints de publication

**Question** : Quels sont les endpoints pour publier les entités ?

**Ce que le frontend envoie actuellement** :

```typescript
// Pour un département
POST /api/publications/departments/:id/publish

// Pour une commune d'Abidjan
POST /api/publications/communes/:id/publish
```

**❓ Ces endpoints sont-ils corrects ? Y a-t-il des différences ?**

---

### 6. Codes des communes

**Question** : Quels sont les codes exacts des 14 communes d'Abidjan ?

**Exemple attendu** :
```
022-001 → ABIDJAN - ABOBO
022-002 → ABIDJAN - ADJAME
022-003 → ABIDJAN - ATTÉCOUBÉ
022-004 → ABIDJAN - COCODY
...
```

**❓ Pouvez-vous fournir la liste complète des 14 communes avec leurs codes ?**

---

### 7. Filtrage des communes

**Question** : Comment filtrer uniquement les communes d'Abidjan ?

**Ce que le frontend envoie** :
```
GET /api/publications/departments?codeDepartement=022
```

**❓ Ce filtre retourne-t-il bien les 14 communes d'Abidjan uniquement ?**

---

### 8. Exemple de réponse complète

**Question** : Pouvez-vous fournir un exemple de réponse complète de l'API ?

**Format souhaité** :
```json
GET /api/publications/departments?page=1&limit=5

{
  "entities": [
    { /* Exemple département */ },
    { /* Exemple commune Abidjan */ }
  ],
  "total": 125,
  "page": 1,
  "limit": 5,
  "totalPages": 25
}
```

**❓ Pouvez-vous partager un exemple JSON réel de votre API ?**

---

## 🔍 Tests à effectuer

Pour vérifier la synchronisation, voici les tests que nous allons faire :

### Test 1 : Liste complète
```
GET /api/publications/departments?page=1&limit=150
```
**Résultat attendu** : 125 entités (111 départements + 14 communes)

### Test 2 : Filtrage communes Abidjan
```
GET /api/publications/departments?codeDepartement=022
```
**Résultat attendu** : 14 communes d'Abidjan uniquement

### Test 3 : Recherche par nom
```
GET /api/publications/departments?search=COCODY
```
**Résultat attendu** : La commune "ABIDJAN - COCODY"

### Test 4 : Publication d'une commune
```
POST /api/publications/communes/:id/publish
```
**Résultat attendu** : Succès avec message "Commune COCODY (Abidjan) publiée avec succès"

---

## 📊 Structure de données attendue

Voici ce que le frontend **nécessite** pour fonctionner correctement :

### Entité (Department OU Commune)

```typescript
interface PublishableEntity {
  id: string;                    // ID unique (ex: "dept-001" ou "commune-022-004")
  code: string;                  // Code (ex: "001" ou "022-004")
  libelle: string;               // Nom (ex: "AGBOVILLE" ou "ABIDJAN - COCODY")
  type: 'DEPARTMENT' | 'COMMUNE'; // Type d'entité
  totalCels: number;             // Nombre total de CELs
  importedCels: number;          // CELs importées
  pendingCels: number;           // CELs en attente
  publicationStatus: 'PUBLISHED' | 'CANCELLED' | 'PENDING';
  lastUpdate: string;            // ISO date (ex: "2025-10-09T10:00:00Z")
  cels: CelData[];               // Liste des CELs
  
  // Optionnel (uniquement pour les communes)
  codeDepartement?: string;      // "022" pour Abidjan
  codeCommune?: string;          // "004" pour COCODY
}
```

---

## ✅ Checklist de compatibilité

Veuillez confirmer les points suivants :

- [ ] Le backend retourne bien **125 entités** (111 départements + 14 communes)
- [ ] Le département "ABIDJAN" global est **exclu** de la liste
- [ ] Les 14 communes d'Abidjan sont **incluses individuellement**
- [ ] Chaque commune a un libellé format **"ABIDJAN - [NOM_COMMUNE]"**
- [ ] Les communes ont un champ permettant de les distinguer des départements
- [ ] L'endpoint `/api/publications/communes/:id/publish` existe
- [ ] Le filtre `codeDepartement=022` retourne les 14 communes
- [ ] La pagination fonctionne correctement avec 125 entités

---

## 🚀 Prochaines étapes

1. **Backend** : Répondre aux questions ci-dessus
2. **Frontend** : Adapter le code selon les réponses
3. **Tests** : Valider l'intégration complète
4. **Déploiement** : Mise en production coordonnée

---

## 📞 Contact

Pour toute question ou clarification, merci de partager :
1. Un exemple de réponse JSON de l'API
2. Les réponses aux questions ci-dessus
3. Tout point qui nécessite une discussion

---

**Merci pour votre collaboration ! 🙏**

