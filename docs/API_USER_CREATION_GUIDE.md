# 📝 Guide de Création d'Utilisateur - Frontend

## 🔗 Base URL
```
http://localhost:3001/api
```

## 🔐 Authentification requise
Toutes les routes nécessitent un token JWT :
```http
Authorization: Bearer <accessToken>
```

---

## 📋 Données à transmettre pour la création d'utilisateur

### **Route de création**
```http
POST /api/users
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### **Structure des données (CreateUserDto)**

```typescript
interface CreateUserDto {
  email: string;                    // ✅ REQUIS - Email valide
  firstName: string;                // ✅ REQUIS - Prénom
  lastName: string;                 // ✅ REQUIS - Nom
  password: string;                 // ✅ REQUIS - Min 6 caractères
  roleId?: string;                  // 🔶 OPTIONNEL - ID du rôle
  departementCodes?: string[];      // 🔶 OPTIONNEL - Codes départements
  celCodes?: string[];              // 🔶 OPTIONNEL - Codes CELs
  isActive?: boolean;               // 🔶 OPTIONNEL - Statut actif (défaut: true)
}
```

### **Exemple de requête complète**
```json
{
  "email": "nouvel.utilisateur@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "password": "motdepasse123",
  "roleId": "USER",
  "departementCodes": ["056", "ABJ"],
  "celCodes": ["041", "408", "029"],
  "isActive": true
}
```

### **Exemple de requête minimale**
```json
{
  "email": "utilisateur.simple@example.com",
  "firstName": "Marie",
  "lastName": "Martin",
  "password": "password123"
}
```

---

## 📋 Routes pour récupérer les listes de sélection

### **1. Liste des rôles**
```http
GET /api/roles/list/simple
Authorization: Bearer <accessToken>
```

**Réponse :**
```json
[
  {
    "id": "USER",
    "code": "USER",
    "name": "Utilisateur"
  },
  {
    "id": "ADMIN",
    "code": "ADMIN", 
    "name": "Administrateur"
  },
  {
    "id": "SADMIN",
    "code": "SADMIN",
    "name": "Super Administrateur"
  }
]
```

### **2. Liste des départements**
```http
GET /api/departements/list/simple
Authorization: Bearer <accessToken>
```

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
  }
]
```

### **3. Liste des CELs (si nécessaire)**
```http
GET /api/cels/list/simple
Authorization: Bearer <accessToken>
```

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
  }
]
```

---

## 🎯 Exemple d'implémentation Frontend

### **TypeScript Interfaces**
```typescript
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

interface Role {
  id: string;
  code: string;
  name: string;
}

interface Departement {
  codeDepartement: string;
  libelleDepartement: string;
}

interface Cel {
  codeCellule: string;
  libelleCellule: string;
}
```

### **Hook React pour les listes**
```typescript
import { useState, useEffect } from 'react';

export function useFormData() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [rolesRes, departementsRes, celsRes] = await Promise.all([
          fetch('/api/roles/list/simple', { headers }),
          fetch('/api/departements/list/simple', { headers }),
          fetch('/api/cels/list/simple', { headers })
        ]);

        if (!rolesRes.ok || !departementsRes.ok || !celsRes.ok) {
          throw new Error('Erreur lors de la récupération des données');
        }

        const [rolesData, departementsData, celsData] = await Promise.all([
          rolesRes.json(),
          departementsRes.json(),
          celsRes.json()
        ]);

        setRoles(rolesData);
        setDepartements(departementsData);
        setCels(celsData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { roles, departements, cels, loading, error };
}
```

### **Composant de formulaire**
```typescript
import React, { useState } from 'react';
import { useFormData } from './hooks/useFormData';

export function CreateUserForm() {
  const { roles, departements, cels, loading, error } = useFormData();
  const [formData, setFormData] = useState<CreateUserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roleId: 'USER', // Valeur par défaut
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création');
      }

      const newUser = await response.json();
      console.log('Utilisateur créé:', newUser);
      alert('Utilisateur créé avec succès !');
      
      // Réinitialiser le formulaire
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        roleId: 'USER',
        departementCodes: [],
        celCodes: [],
        isActive: true
      });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  if (loading) return <div>Chargement des données...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Prénom *</label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Nom *</label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Mot de passe *</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
          minLength={6}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Rôle</label>
        <select
          value={formData.roleId}
          onChange={(e) => setFormData({...formData, roleId: e.target.value})}
          className="w-full p-2 border rounded"
        >
          {roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Départements</label>
        <select
          multiple
          value={formData.departementCodes}
          onChange={(e) => setFormData({
            ...formData, 
            departementCodes: Array.from(e.target.selectedOptions, option => option.value)
          })}
          className="w-full p-2 border rounded"
          size={5}
        >
          {departements.map(dept => (
            <option key={dept.codeDepartement} value={dept.codeDepartement}>
              {dept.libelleDepartement}
            </option>
          ))}
        </select>
        <small>Maintenez Ctrl (Cmd sur Mac) pour sélectionner plusieurs départements</small>
      </div>

      <div>
        <label>CELs (Cellules Électorales Locales)</label>
        <select
          multiple
          value={formData.celCodes}
          onChange={(e) => setFormData({
            ...formData, 
            celCodes: Array.from(e.target.selectedOptions, option => option.value)
          })}
          className="w-full p-2 border rounded"
          size={5}
        >
          {cels.map(cel => (
            <option key={cel.codeCellule} value={cel.codeCellule}>
              {cel.libelleCellule}
            </option>
          ))}
        </select>
        <small>Maintenez Ctrl (Cmd sur Mac) pour sélectionner plusieurs CELs</small>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
          />
          Utilisateur actif
        </label>
      </div>

      <button 
        type="submit" 
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Créer l'utilisateur
      </button>
    </form>
  );
}
```

---

## ✅ Validation des données

### **Règles de validation**
- **email** : Format email valide, unique
- **firstName** : Chaîne non vide
- **lastName** : Chaîne non vide  
- **password** : Minimum 6 caractères
- **roleId** : Doit exister dans la base de données
- **departementCodes** : Tableau de codes valides
- **celCodes** : Tableau de codes CELs valides
- **isActive** : Booléen (défaut: true)

### **Messages d'erreur possibles**
```json
{
  "message": "Email invalide",
  "error": "Bad Request",
  "statusCode": 400
}
```

```json
{
  "message": "Le mot de passe doit contenir au moins 6 caractères",
  "error": "Bad Request", 
  "statusCode": 400
}
```

```json
{
  "message": "Rôle non trouvé",
  "error": "Not Found",
  "statusCode": 404
}
```

```json
{
  "message": "CELs non trouvées: CEL_INEXISTANTE_1, CEL_INEXISTANTE_2",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 🧪 Tests disponibles

```bash
# Tester les rôles
npm run test:roles

# Tester les listes
npm run test:lists

# Tester la création d'utilisateur
npm run test:user-creation

# Tester la création avec CELs
npm run test:user-cels

# Tester tous les endpoints
npm run test:all
```

---

## 📊 Rôles disponibles

| Code | Nom | Description |
|------|-----|-------------|
| `USER` | Utilisateur | Agent CEI - Accès limité aux données assignées |
| `ADMIN` | Administrateur | Accès complet au système - Gestion des données électorales |
| `SADMIN` | Super Administrateur | Accès complet au système - Gestion des utilisateurs et configuration |

---

## 💡 Conseils d'implémentation

1. **Chargement initial** : Récupérez les listes (rôles, départements) au chargement du composant
2. **Validation côté client** : Validez les données avant l'envoi
3. **Gestion d'erreurs** : Affichez les messages d'erreur de manière claire
4. **UX** : Affichez un indicateur de chargement pendant les requêtes
5. **Sécurité** : Ne stockez jamais le mot de passe en local
6. **Feedback** : Confirmez la création avec un message de succès

Votre formulaire de création d'utilisateur est maintenant prêt ! 🚀
