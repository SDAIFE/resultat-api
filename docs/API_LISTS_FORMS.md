# 📋 API Listes pour Formulaires - Documentation Frontend

## 📋 Base URL
```
http://localhost:3001/api
```

## 🔐 Authentification requise
Toutes les routes nécessitent un token JWT dans l'en-tête :
```http
Authorization: Bearer <accessToken>
```

---

## 🏢 Routes pour les Départements

### **Liste simple des départements**
```http
GET /api/departements/list/simple
Authorization: Bearer <accessToken>
```

**Description :** Récupère une liste simple de tous les départements pour les formulaires de sélection.

**Réponse :**
```json
[
  {
    "codeDepartement": "056",
    "libelleDepartement": "ABENGOUROU"
  },
  {
    "codeDepartement": "ABJ",
    "libelleDepartement": "Abidjan"
  },
  {
    "codeDepartement": "022",
    "libelleDepartement": "ABIDJAN"
  }
]
```

**Utilisation dans un formulaire :**
```typescript
// Récupérer la liste des départements
const departements = await fetch('/api/departements/list/simple', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

// Utiliser dans un select
<select name="departementCodes" multiple>
  {departements.map(dept => (
    <option key={dept.codeDepartement} value={dept.codeDepartement}>
      {dept.libelleDepartement}
    </option>
  ))}
</select>
```

---

## 🏛️ Routes pour les CELs (Cellules Électorales Locales)

### **Liste simple des CELs**
```http
GET /api/cels/list/simple
Authorization: Bearer <accessToken>
```

**Description :** Récupère une liste simple de toutes les CELs pour les formulaires de sélection.

**Réponse :**
```json
[
  {
    "codeCellule": "041",
    "libelleCellule": "CESP GBON"
  },
  {
    "codeCellule": "408",
    "libelleCellule": "CESP TIEBISSOU"
  },
  {
    "codeCellule": "029",
    "libelleCellule": "CESP TIE-NDIEKRO"
  }
]
```

**Utilisation dans un formulaire :**
```typescript
// Récupérer la liste des CELs
const cels = await fetch('/api/cels/list/simple', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

// Utiliser dans un select
<select name="celCodes" multiple>
  {cels.map(cel => (
    <option key={cel.codeCellule} value={cel.codeCellule}>
      {cel.libelleCellule}
    </option>
  ))}
</select>
```

---

## 🔧 Exemples d'implémentation Frontend

### TypeScript Interfaces
```typescript
interface SimpleDepartement {
  codeDepartement: string;
  libelleDepartement: string;
}

interface SimpleCel {
  codeCellule: string;
  libelleCellule: string;
}

interface CreateUserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId?: string;
  departementCodes?: string[];
  celCodes?: string[];
  isActive?: boolean;
}
```

### Hook React pour les listes
```typescript
import { useState, useEffect } from 'react';

export function useFormLists() {
  const [departements, setDepartements] = useState<SimpleDepartement[]>([]);
  const [cels, setCels] = useState<SimpleCel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [departementsRes, celsRes] = await Promise.all([
          fetch('/api/departements/list/simple', { headers }),
          fetch('/api/cels/list/simple', { headers })
        ]);

        if (!departementsRes.ok || !celsRes.ok) {
          throw new Error('Erreur lors de la récupération des listes');
        }

        const [departementsData, celsData] = await Promise.all([
          departementsRes.json(),
          celsRes.json()
        ]);

        setDepartements(departementsData);
        setCels(celsData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setLoading(false);
      }
    };

    fetchLists();
  }, []);

  return { departements, cels, loading, error };
}
```

### Composant de formulaire de création d'utilisateur
```typescript
import React, { useState } from 'react';
import { useFormLists } from './hooks/useFormLists';

export function CreateUserForm() {
  const { departements, cels, loading, error } = useFormLists();
  const [formData, setFormData] = useState<CreateUserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    departementCodes: [],
    celCodes: [],
    isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'utilisateur');
      }

      const newUser = await response.json();
      console.log('Utilisateur créé:', newUser);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  if (loading) return <div>Chargement des listes...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Prénom:</label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Nom:</label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Mot de passe:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
      </div>

      <div>
        <label>Départements:</label>
        <select
          multiple
          value={formData.departementCodes}
          onChange={(e) => setFormData({
            ...formData, 
            departementCodes: Array.from(e.target.selectedOptions, option => option.value)
          })}
        >
          {departements.map(dept => (
            <option key={dept.codeDepartement} value={dept.codeDepartement}>
              {dept.libelleDepartement}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>CELs:</label>
        <select
          multiple
          value={formData.celCodes}
          onChange={(e) => setFormData({
            ...formData, 
            celCodes: Array.from(e.target.selectedOptions, option => option.value)
          })}
        >
          {cels.map(cel => (
            <option key={cel.codeCellule} value={cel.codeCellule}>
              {cel.libelleCellule}
            </option>
          ))}
        </select>
      </div>

      <button type="submit">Créer l'utilisateur</button>
    </form>
  );
}
```

### Fonctions utilitaires
```typescript
// Récupérer la liste des départements
export async function getDepartementsList(): Promise<SimpleDepartement[]> {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('/api/departements/list/simple', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des départements');
  }

  return response.json();
}

// Récupérer la liste des CELs
export async function getCelsList(): Promise<SimpleCel[]> {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('/api/cels/list/simple', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des CELs');
  }

  return response.json();
}

// Récupérer les deux listes en parallèle
export async function getFormLists(): Promise<{
  departements: SimpleDepartement[];
  cels: SimpleCel[];
}> {
  const [departements, cels] = await Promise.all([
    getDepartementsList(),
    getCelsList()
  ]);

  return { departements, cels };
}
```

---

## 📊 Statistiques des listes

### Départements
- **Total :** 114 départements
- **Tri :** Par libellé (ordre alphabétique)
- **Format :** `{ codeDepartement, libelleDepartement }`

### CELs
- **Total :** 564 CELs
- **Tri :** Par libellé (ordre alphabétique)
- **Format :** `{ codeCellule, libelleCellule }`

---

## 🧪 Tests disponibles

```bash
# Tester les listes
npm run test:lists

# Tester tous les endpoints
npm run test:all

# Tester le CRUD utilisateurs
npm run test:users
```

---

## 💡 Avantages de ces routes

1. **Performance** : Récupération rapide des données essentielles
2. **Simplicité** : Format optimisé pour les formulaires
3. **Tri automatique** : Données triées par libellé
4. **Léger** : Seulement les champs nécessaires
5. **Cachable** : Peut être mis en cache côté frontend
6. **Réutilisable** : Utilisable dans tous les formulaires

Ces routes sont parfaites pour alimenter les listes déroulantes et les sélecteurs multiples dans vos formulaires de création d'utilisateurs ! 🚀
