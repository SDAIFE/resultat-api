# 🎨 Guide Frontend - Adaptations Sécurité

**Date** : 9 octobre 2025  
**Destinataires** : Équipe Frontend (Next.js/React)  
**Importance** : ⚠️ **CRITIQUE** - Actions obligatoires avant production

---

## 🚨 CHANGEMENTS BREAKING

### 1. ⚠️ URLs API - Versioning (/api/v1)

**TOUS les endpoints changent de `/api/*` à `/api/v1/*`**

#### ❌ Ancien
```typescript
const API_URL = 'http://localhost:3001/api';

// Exemples
POST /api/auth/login
GET  /api/users
GET  /api/publications/departments
POST /api/upload/excel
```

#### ✅ Nouveau (OBLIGATOIRE)
```typescript
const API_URL = 'http://localhost:3001/api/v1';

// Exemples
POST /api/v1/auth/login
GET  /api/v1/users
GET  /api/v1/publications/departments
POST /api/v1/upload/excel
```

#### 📝 Configuration recommandée

**Next.js - Variable d'environnement** :
```env
# .env.local (développement)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# .env.production
NEXT_PUBLIC_API_URL=https://api.votredomaine.com/api/v1
```

**Fichier de configuration API** :
```typescript
// lib/api.ts ou config/api.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 30000, // 30 secondes (même que le backend)
};

// Client axios
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Pour les cookies si nécessaire
});
```

**Utilisation** :
```typescript
// ✅ Correct
await apiClient.post('/auth/login', credentials);
await apiClient.get('/users');

// ❌ Ne PLUS faire
await axios.post('http://localhost:3001/api/auth/login');
```

---

## 🔒 NOUVELLES VALIDATIONS À IMPLÉMENTER

### 2. Mots de passe forts (Nouveaux utilisateurs)

**Nouvelles exigences** :
- ✅ Minimum **12 caractères** (au lieu de 6)
- ✅ Au moins **1 majuscule**
- ✅ Au moins **1 minuscule**
- ✅ Au moins **1 chiffre**
- ✅ Au moins **1 caractère spécial** (@$!%*?&)

#### Frontend - Validation en temps réel

**React Hook Form + Zod** :
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schéma de validation (identique au backend)
const passwordSchema = z.string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[@$!%*?&]/, 'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)');

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Dans le composant
const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
  resolver: zodResolver(registerSchema),
});
```

**Composant indicateur de force du mot de passe** :
```tsx
// components/PasswordStrengthIndicator.tsx
interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = calculateStrength(password);
  
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded ${
              i < strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-sm mt-1 ${strength.color.replace('bg-', 'text-')}`}>
        {strength.label}
      </p>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-gray-600 mt-1">
          {strength.feedback.map((tip, i) => (
            <li key={i}>• {tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function calculateStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];
  
  if (password.length >= 12) score++;
  else feedback.push('Au moins 12 caractères');
  
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Au moins une minuscule');
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Au moins une majuscule');
  
  if (/\d/.test(password)) score++;
  else feedback.push('Au moins un chiffre');
  
  if (/[@$!%*?&]/.test(password)) score++;
  else feedback.push('Au moins un caractère spécial (@$!%*?&)');
  
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];
  
  return {
    score,
    label: labels[score] || 'Très faible',
    color: colors[score] || 'bg-red-500',
    feedback,
  };
}
```

**⚠️ Important** : 
- Les **anciens utilisateurs** peuvent garder leurs mots de passe faibles
- Seuls les **nouveaux utilisateurs** et **changements de mot de passe** sont impactés

---

### 3. Rate Limiting - Gestion des erreurs

**Le backend limite à** :
- **5 tentatives de login** par minute
- **10 tentatives de refresh** par minute
- **100 requêtes globales** par minute

#### Messages d'erreur à gérer

**Erreur 429 - Too Many Requests** :
```typescript
// Intercepteur axios pour gérer le rate limiting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      
      toast.error(
        `Trop de tentatives. Veuillez réessayer dans ${retryAfter} secondes.`,
        {
          duration: retryAfter * 1000,
        }
      );
      
      // Optionnel : Désactiver le bouton de connexion temporairement
      return Promise.reject({
        ...error,
        isRateLimited: true,
        retryAfter,
      });
    }
    
    return Promise.reject(error);
  }
);
```

**Composant de login avec rate limiting** :
```tsx
const [isRateLimited, setIsRateLimited] = useState(false);
const [retryAfter, setRetryAfter] = useState(0);

const handleLogin = async (data: LoginFormData) => {
  try {
    setLoading(true);
    await apiClient.post('/auth/login', data);
    router.push('/dashboard');
  } catch (error: any) {
    if (error.isRateLimited) {
      setIsRateLimited(true);
      setRetryAfter(error.retryAfter);
      
      // Décompte
      const interval = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      toast.error(error.response?.data?.message || 'Identifiants invalides');
    }
  } finally {
    setLoading(false);
  }
};

// Dans le JSX
<button
  type="submit"
  disabled={loading || isRateLimited}
>
  {isRateLimited 
    ? `Réessayez dans ${retryAfter}s` 
    : loading 
    ? 'Connexion...' 
    : 'Se connecter'
  }
</button>
```

---

### 4. Timeouts - 30 secondes maximum

**Le backend timeout après 30 secondes**

#### Gestion des requêtes longues

```typescript
// Configuration axios avec timeout
export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: 30000, // 30 secondes
});

// Pour les uploads (peuvent être plus longs)
export const uploadClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: 60000, // 60 secondes pour les uploads
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Gestion du timeout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.response?.status === 503) {
      toast.error(
        'La requête a expiré. Veuillez réessayer.',
        { duration: 5000 }
      );
    }
    return Promise.reject(error);
  }
);
```

**Indicateur de progression pour uploads** :
```tsx
const [uploadProgress, setUploadProgress] = useState(0);

const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('codeCellule', selectedCel);
  
  try {
    await uploadClient.post('/upload/excel', formData, {
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 100)
        );
        setUploadProgress(progress);
      },
    });
    
    toast.success('Fichier uploadé avec succès');
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      toast.error('Upload trop long (> 60s). Fichier trop volumineux ?');
    } else {
      toast.error(error.response?.data?.message || 'Erreur upload');
    }
  }
};
```

---

### 5. Upload de fichiers - Nouvelles limitations

**Changements** :
- ✅ Taille maximum : **10MB** (au lieu de 50MB)
- ✅ Validation stricte du type de fichier
- ✅ Noms de fichiers générés aléatoirement

#### Validation côté frontend

```tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
];

const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Vérifier la taille
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 10MB`,
    };
  }
  
  // Vérifier le type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé (${file.type}). Seuls les fichiers Excel (.xlsx, .xls) et CSV (.csv) sont acceptés.`,
    };
  }
  
  return { valid: true };
};

// Dans le composant
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const validation = validateFile(file);
  if (!validation.valid) {
    toast.error(validation.error);
    e.target.value = ''; // Reset l'input
    return;
  }
  
  setSelectedFile(file);
};

// JSX
<input
  type="file"
  accept=".xlsx,.xls,.csv"
  onChange={handleFileChange}
  className="..."
/>
<p className="text-xs text-gray-500 mt-1">
  Formats acceptés : Excel (.xlsx, .xls) ou CSV • Taille max : 10MB
</p>
```

---

## 🔐 BONNES PRATIQUES SÉCURITÉ FRONTEND

### 6. Gestion sécurisée des tokens JWT

**Ne JAMAIS stocker les tokens dans localStorage** (vulnérable XSS)

#### ✅ Recommandé : Cookies HttpOnly

**Backend (déjà configuré)** :
```typescript
// Le backend envoie déjà credentials: true
app.enableCors({
  origin: validOrigins,
  credentials: true,
});
```

**Frontend** :
```typescript
// Axios avec credentials
export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  withCredentials: true, // Envoie les cookies
});

// Le token est dans un cookie HttpOnly
// ✅ Pas accessible depuis JavaScript (protection XSS)
// ✅ Envoyé automatiquement avec chaque requête
```

#### Alternative : Memory storage (si pas de cookies)

```typescript
// lib/auth.ts
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const authStore = {
  setTokens: (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
  },
  
  getAccessToken: () => accessToken,
  
  getRefreshToken: () => refreshToken,
  
  clearTokens: () => {
    accessToken = null;
    refreshToken = null;
  },
};

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automatique si token expiré (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = authStore.getRefreshToken();
        const { data } = await apiClient.post('/auth/refresh', {
          refreshToken,
        });
        
        authStore.setTokens(data.accessToken, refreshToken!);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué, rediriger vers login
        authStore.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

**⚠️ Limitation** : Les tokens sont perdus au refresh de la page.  
**Solution** : Utiliser des cookies HttpOnly (recommandé).

---

### 7. Protection CSRF (si utilisation de cookies)

**Si vous utilisez des cookies** :

```typescript
// Le backend a credentials: true
// Vous devez gérer le token CSRF si implémenté

// Headers CSRF
apiClient.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Récupérer le token CSRF du cookie
const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? match[1] : null;
};

apiClient.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return config;
});
```

---

### 8. Validation côté client (défense en profondeur)

**Même si le backend valide, validez côté client pour UX**

```typescript
// Schémas de validation réutilisables
export const validationSchemas = {
  email: z.string()
    .email('Email invalide')
    .toLowerCase(),
  
  password: z.string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .regex(/[a-z]/, 'Au moins une minuscule')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/\d/, 'Au moins un chiffre')
    .regex(/[@$!%*?&]/, 'Au moins un caractère spécial (@$!%*?&)'),
  
  name: z.string()
    .min(1, 'Ce champ est requis')
    .max(100, 'Maximum 100 caractères'),
};
```

---

## 📊 NOUVEAUX ENDPOINTS À INTÉGRER

### 9. Audit Logs (SADMIN uniquement)

**Nouveaux endpoints disponibles** :

```typescript
// Types
interface AuditLog {
  id: string;
  userId: string | null;
  action: string; // LOGIN, LOGOUT, CREATE_USER, etc.
  resource: string; // auth, users, publication, etc.
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  success: boolean;
  timestamp: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditStatsResponse {
  totalLogs: number;
  successLogs: number;
  failedLogs: number;
  successRate: string;
  actionsByType: Array<{ action: string; count: number }>;
  topUsers: Array<{ userId: string; user: string; count: number }>;
}

// API calls
export const auditApi = {
  // Liste des logs
  getLogs: async (params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
  }) => {
    const { data } = await apiClient.get<AuditLogsResponse>('/audit/logs', {
      params,
    });
    return data;
  },
  
  // Statistiques
  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const { data } = await apiClient.get<AuditStatsResponse>('/audit/stats', {
      params,
    });
    return data;
  },
};

// Utilisation
const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    action: '',
    startDate: '',
    endDate: '',
  });
  
  useEffect(() => {
    const fetchLogs = async () => {
      const data = await auditApi.getLogs(filters);
      setLogs(data.logs);
    };
    fetchLogs();
  }, [filters]);
  
  return (
    <div>
      {/* Filtres */}
      <div className="filters">
        <select onChange={(e) => setFilters({...filters, action: e.target.value})}>
          <option value="">Toutes les actions</option>
          <option value="LOGIN">Connexion</option>
          <option value="LOGOUT">Déconnexion</option>
          <option value="LOGIN_FAILED">Échec connexion</option>
        </select>
      </div>
      
      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Action</th>
            <th>IP</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
              <td>{log.user ? `${log.user.firstName} ${log.user.lastName}` : '-'}</td>
              <td>{log.action}</td>
              <td>{log.ipAddress}</td>
              <td>
                <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                  {log.success ? '✓ Succès' : '✗ Échec'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 📋 CHECKLIST MIGRATION FRONTEND

### Actions obligatoires

- [ ] **Mettre à jour toutes les URLs** : `/api/*` → `/api/v1/*`
- [ ] Configurer `NEXT_PUBLIC_API_URL` avec `/api/v1`
- [ ] Tester tous les appels API
- [ ] Ajouter validation mot de passe fort (12+ caractères)
- [ ] Gérer erreur 429 (rate limiting)
- [ ] Gérer timeout (30s)
- [ ] Valider fichiers avant upload (10MB max)
- [ ] Ajouter indicateur de force du mot de passe
- [ ] Tester le refresh token
- [ ] Intégrer les endpoints audit (si SADMIN)

### Tests recommandés

```bash
# Test 1 : Login avec rate limiting
# Essayer 6 connexions en 1 minute
# → La 6ème doit afficher le message de rate limit

# Test 2 : Mot de passe faible
# Essayer de créer un utilisateur avec "test123"
# → Doit afficher les erreurs de validation

# Test 3 : Upload fichier > 10MB
# Essayer d'uploader un fichier de 15MB
# → Doit être bloqué avec message clair

# Test 4 : Vérifier toutes les routes
# Parcourir l'app et vérifier qu'aucune route ne 404
```

---

## 🚨 MESSAGES D'ERREUR À GÉRER

### Nouveaux codes d'erreur

| Code | Signification | Message utilisateur |
|------|---------------|---------------------|
| 400 | Validation échouée | Afficher les détails du backend |
| 401 | Non authentifié | "Session expirée. Veuillez vous reconnecter." |
| 403 | Non autorisé | "Vous n'avez pas les permissions nécessaires." |
| 429 | Rate limited | "Trop de tentatives. Réessayez dans X secondes." |
| 503 | Timeout | "La requête a expiré. Veuillez réessayer." |

### Exemples de messages

```typescript
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Les données envoyées sont invalides.',
  401: 'Votre session a expiré. Veuillez vous reconnecter.',
  403: 'Vous n\'avez pas les permissions nécessaires.',
  404: 'Ressource non trouvée.',
  429: 'Trop de tentatives. Veuillez patienter.',
  500: 'Erreur serveur. Veuillez réessayer plus tard.',
  503: 'Le service est temporairement indisponible.',
};

// Gestion globale
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || ERROR_MESSAGES[status] || 'Une erreur est survenue';
    
    toast.error(message);
    return Promise.reject(error);
  }
);
```

---

## 📖 RESSOURCES & DOCUMENTATION

### Documentation API

- Base URL : `http://localhost:3001/api/v1` (dev)
- Base URL : `https://api.votredomaine.com/api/v1` (prod)
- Authentification : Bearer token ou Cookie HttpOnly
- Format : JSON
- Timeout : 30 secondes

### Endpoints principaux

```
Auth:
POST   /api/v1/auth/login
POST   /api/v1/auth/register (SADMIN)
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/profile

Users:
GET    /api/v1/users
POST   /api/v1/users (SADMIN/ADMIN)
PUT    /api/v1/users/:id (SADMIN/ADMIN)
DELETE /api/v1/users/:id (SADMIN)

Audit (SADMIN):
GET    /api/v1/audit/logs
GET    /api/v1/audit/stats

Publications:
GET    /api/v1/publications/departments
POST   /api/v1/publications/:id/publish

Upload:
POST   /api/v1/upload/excel
```

---

## 💡 EXEMPLES COMPLETS

### Composant de login complet

```tsx
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { authStore } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiClient.post('/auth/login', data);
      
      // Stocker les tokens
      authStore.setTokens(response.data.accessToken, response.data.refreshToken);
      
      toast.success('Connexion réussie !');
      window.location.href = '/dashboard';
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Rate limited
        const retrySeconds = 60;
        setIsRateLimited(true);
        setRetryAfter(retrySeconds);
        
        toast.error(`Trop de tentatives. Réessayez dans ${retrySeconds} secondes.`);
        
        const interval = setInterval(() => {
          setRetryAfter((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsRateLimited(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (error.response?.status === 401) {
        toast.error('Identifiants invalides');
      } else {
        toast.error('Une erreur est survenue');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Mot de passe
        </label>
        <input
          {...register('password')}
          type="password"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isRateLimited}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
      >
        {isRateLimited
          ? `Réessayez dans ${retryAfter}s`
          : isSubmitting
          ? 'Connexion...'
          : 'Se connecter'}
      </button>
    </form>
  );
}
```

---

## 🆘 SUPPORT

### En cas de problème

1. **Vérifier les URLs** : Toutes doivent pointer vers `/api/v1/*`
2. **Vérifier la console réseau** : Regarder les requêtes HTTP
3. **Consulter la documentation backend** : `docs/SECURITE_RECAP_COMPLET.md`
4. **Contacter l'équipe backend** si problème persistant

### Contact

- 📧 Email backend : backend-team@votredomaine.com
- 💬 Slack : #api-support
- 📚 Documentation : `/docs` du repo backend

---

**Créé le** : 9 octobre 2025  
**Dernière mise à jour** : 9 octobre 2025  
**Version** : 1.0

