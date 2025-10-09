# 📋 Plan d'Action - Phases 3 & 4 de Sécurité

**Date** : 9 octobre 2025  
**Statut actuel** : Phase 1 & 2 complétées ✅  
**Prochaines étapes** : Phases 3 & 4

---

## 🟡 PHASE 3 - VULNÉRABILITÉS MOYENNES

**Priorité** : Recommandé  
**Délai suggéré** : 30 jours  
**Impact** : Moyen  
**Effort** : Moyen

---

### 🟡 MED-001 : CORS potentiellement trop permissif

**Statut actuel** : ⚠️ Partiellement résolu  
**Effort estimé** : 1-2 heures  
**Priorité** : Moyenne

#### Ce qui a déjà été fait
```typescript
// Validation des URLs CORS
const validOrigins = corsOrigins.filter(origin => {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
});
```

#### Ce qui reste à faire

1. **Logger les rejets CORS** (pour détecter les attaques)
   ```typescript
   // Dans src/main.ts
   origin: (origin, callback) => {
     if (!origin || validOrigins.includes(origin)) {
       callback(null, true);
     } else {
       // Ajouter logging
       logger.warn(`CORS rejected: ${origin} from IP: ${req.ip}`);
       callback(new Error('Not allowed by CORS'));
     }
   }
   ```

2. **Créer une whitelist stricte pour production**
   ```typescript
   // env.example
   # Production : uniquement domaines connus
   CORS_ORIGINS="https://app.votredomaine.com,https://admin.votredomaine.com"
   
   # Pas de wildcards, pas de localhost en production
   ```

3. **Ajouter protection CSRF pour les requêtes sensibles**
   ```bash
   npm install csurf
   ```

**Validation** : Tester qu'une requête depuis `evil.com` est rejetée et loggée.

---

### 🟡 MED-002 : Absence de validation HTTPS en production

**Statut actuel** : ✅ Déjà résolu  
**Effort estimé** : 0 heures

#### Ce qui a été fait
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

**✅ Aucune action nécessaire** - Déjà corrigé lors de la Phase 2.

---

### 🟡 MED-003 : Pas de timeout sur les requêtes

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 2-3 heures  
**Priorité** : **HAUTE** (recommandé avant production)

#### Problème
- Requêtes peuvent bloquer indéfiniment
- Vulnérable aux attaques Slowloris
- Épuisement des ressources

#### Solution

1. **Installer le package**
   ```bash
   npm install express-timeout-handler
   ```

2. **Configurer dans main.ts**
   ```typescript
   import * as timeout from 'express-timeout-handler';
   
   app.use(timeout.handler({
     timeout: 30000, // 30 secondes
     onTimeout: (req, res) => {
       res.status(503).json({
         statusCode: 503,
         message: 'La requête a expiré après 30 secondes',
         error: 'Request Timeout'
       });
     },
     onDelayedResponse: (req, method, args, requestTime) => {
       console.warn(`⚠️ Requête lente: ${req.method} ${req.url} - ${requestTime}ms`);
     },
   }));
   ```

3. **Configurer timeouts spécifiques pour les requêtes longues**
   ```typescript
   // Pour les endpoints d'upload
   @Post('excel')
   @Timeout(60000) // 60 secondes pour l'upload
   async uploadExcel(...) { ... }
   ```

**Validation** : Créer une requête qui prend > 30s et vérifier qu'elle timeout.

---

### 🟡 MED-004 : Sessions non invalidées côté serveur lors de la déconnexion

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 4-6 heures  
**Priorité** : Moyenne

#### Problème actuel
```typescript
// Le refresh token est invalidé, mais l'access token reste valide jusqu'à expiration (15min)
async logout(refreshToken: string): Promise<void> {
  await this.prisma.session.deleteMany({ where: { refreshToken } });
}
```

#### Solution : Implémenter une blacklist de tokens

1. **Utiliser Redis pour la blacklist (recommandé)**
   ```bash
   npm install ioredis @nestjs/cache-manager cache-manager-ioredis-yet
   ```

2. **Configuration Redis**
   ```typescript
   // Dans app.module.ts
   import { CacheModule } from '@nestjs/cache-manager';
   import * as redisStore from 'cache-manager-ioredis-yet';
   
   @Module({
     imports: [
       CacheModule.register({
         isGlobal: true,
         store: redisStore,
         host: process.env.REDIS_HOST || 'localhost',
         port: process.env.REDIS_PORT || 6379,
       }),
     ],
   })
   ```

3. **Modifier le service de logout**
   ```typescript
   // Dans auth.service.ts
   import { CACHE_MANAGER } from '@nestjs/cache-manager';
   import { Cache } from 'cache-manager';
   
   constructor(
     @Inject(CACHE_MANAGER) private cacheManager: Cache,
   ) {}
   
   async logout(accessToken: string, refreshToken: string): Promise<void> {
     // Décoder le token pour obtenir l'expiration
     const decoded = this.jwtService.decode(accessToken) as any;
     const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
     
     // Ajouter à la blacklist (TTL = temps restant)
     await this.cacheManager.set(
       `blacklist:${accessToken}`,
       true,
       expiresIn * 1000
     );
     
     // Supprimer la session
     await this.prisma.session.deleteMany({ where: { refreshToken } });
   }
   ```

4. **Vérifier la blacklist dans JwtStrategy**
   ```typescript
   // Dans jwt.strategy.ts
   async validate(payload: any, @Req() req: Request) {
     const token = req.headers.authorization?.split(' ')[1];
     
     // Vérifier si le token est blacklisté
     const isBlacklisted = await this.cacheManager.get(`blacklist:${token}`);
     if (isBlacklisted) {
       throw new UnauthorizedException('Token révoqué');
     }
     
     // ... reste de la validation
   }
   ```

5. **Ajouter endpoint /auth/logout-all**
   ```typescript
   @Post('logout-all')
   @UseGuards(JwtAuthGuard)
   async logoutAll(@CurrentUser() user: any) {
     // Supprimer toutes les sessions de l'utilisateur
     await this.prisma.session.deleteMany({ 
       where: { userId: user.id } 
     });
     
     return { message: 'Déconnecté de tous les appareils' };
   }
   ```

**Alternative sans Redis** : Stocker la blacklist en base de données (moins performant).

**Validation** : Se connecter, se déconnecter, vérifier que le token ne fonctionne plus immédiatement.

---

### 🟡 MED-005 : Pas de limitation sur le nombre de sessions actives

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 2-3 heures  
**Priorité** : Moyenne

#### Solution

1. **Limiter à 5 sessions actives par utilisateur**
   ```typescript
   // Dans auth.service.ts - méthode generateTokens
   async generateTokens(userId: string): Promise<{...}> {
     // Compter les sessions actives
     const activeSessions = await this.prisma.session.count({
       where: {
         userId,
         expiresAt: { gt: new Date() }
       }
     });
     
     // Si limite atteinte, supprimer la plus ancienne
     if (activeSessions >= 5) {
       const oldestSession = await this.prisma.session.findFirst({
         where: { userId, expiresAt: { gt: new Date() } },
         orderBy: { createdAt: 'asc' }
       });
       
       if (oldestSession) {
         await this.prisma.session.delete({ 
           where: { id: oldestSession.id } 
         });
         
         // Optionnel : Notifier l'utilisateur
         console.log(`Session expirée pour ${userId} (limite atteinte)`);
       }
     }
     
     // ... créer la nouvelle session
   }
   ```

2. **Ajouter endpoint pour lister les sessions**
   ```typescript
   @Get('sessions')
   @UseGuards(JwtAuthGuard)
   async getSessions(@CurrentUser() user: any) {
     const sessions = await this.prisma.session.findMany({
       where: { 
         userId: user.id,
         expiresAt: { gt: new Date() }
       },
       select: {
         id: true,
         createdAt: true,
         expiresAt: true,
       },
       orderBy: { createdAt: 'desc' }
     });
     
     return { sessions };
   }
   ```

3. **Ajouter endpoint pour révoquer une session spécifique**
   ```typescript
   @Delete('sessions/:sessionId')
   @UseGuards(JwtAuthGuard)
   async revokeSession(
     @Param('sessionId') sessionId: string,
     @CurrentUser() user: any
   ) {
     // Vérifier que la session appartient à l'utilisateur
     const session = await this.prisma.session.findFirst({
       where: { id: sessionId, userId: user.id }
     });
     
     if (!session) {
       throw new NotFoundException('Session non trouvée');
     }
     
     await this.prisma.session.delete({ where: { id: sessionId } });
     
     return { message: 'Session révoquée' };
   }
   ```

**Validation** : Créer 6 sessions, vérifier que la plus ancienne est supprimée.

---

### 🟡 MED-006 : Pas de protection contre les attaques par timing

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 1-2 heures  
**Priorité** : Faible-Moyenne

#### Problème
L'attaquant peut détecter si un email existe en mesurant le temps de réponse :
- Email existe → bcrypt prend ~100ms
- Email n'existe pas → réponse immédiate

#### Solution

```typescript
// Dans auth.service.ts - méthode login
async login(loginDto: LoginDto): Promise<AuthResponseDto> {
  const { email, password } = loginDto;
  
  const user = await this.prisma.user.findUnique({ 
    where: { email },
    include: { role: true, departements: true }
  });
  
  // Hash factice si l'utilisateur n'existe pas (pour timing constant)
  const hashToCompare = user?.password || 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Qvbjmu'; // Hash de "dummy"
  
  const isPasswordValid = await bcrypt.compare(password, hashToCompare);
  
  // Délai aléatoire pour masquer le timing (50-150ms)
  await new Promise(resolve => 
    setTimeout(resolve, Math.random() * 100 + 50)
  );
  
  // Message générique dans tous les cas
  if (!user || !user.isActive || !isPasswordValid) {
    throw new UnauthorizedException('Identifiants invalides');
  }
  
  // ... reste du code
}
```

**Validation** : Mesurer le temps de réponse avec un email existant vs non-existant (devrait être similaire).

---

### 🟡 MED-007 : Absence d'audit logging pour les actions sensibles

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 6-8 heures  
**Priorité** : **HAUTE** (conformité RGPD)

#### Solution complète

1. **Créer le modèle Prisma**
   ```prisma
   // Dans schema.prisma
   model AuditLog {
     id          String   @id @default(cuid())
     userId      String?
     action      String   // LOGIN, LOGOUT, CREATE_USER, DELETE_USER, etc.
     resource    String   // auth, users, publication, upload
     resourceId  String?
     ipAddress   String?
     userAgent   String?
     details     String?  @db.NVarChar(Max) // JSON avec détails
     success     Boolean  @default(true)
     timestamp   DateTime @default(now())
     
     user User? @relation(fields: [userId], references: [id])
     
     @@map("audit_logs")
     @@index([userId, timestamp])
     @@index([action, timestamp])
   }
   
   // Ajouter dans le modèle User
   auditLogs AuditLog[]
   ```

2. **Créer le service d'audit**
   ```typescript
   // src/common/services/audit.service.ts
   import { Injectable } from '@nestjs/common';
   import { PrismaService } from '../../database/prisma.service';
   
   export interface AuditLogData {
     userId?: string;
     action: string;
     resource: string;
     resourceId?: string;
     ipAddress?: string;
     userAgent?: string;
     details?: any;
     success?: boolean;
   }
   
   @Injectable()
   export class AuditService {
     constructor(private prisma: PrismaService) {}
     
     async log(data: AuditLogData): Promise<void> {
       try {
         await this.prisma.auditLog.create({
           data: {
             ...data,
             details: data.details ? JSON.stringify(data.details) : null,
             success: data.success ?? true,
           }
         });
       } catch (error) {
         // Ne jamais faire échouer une action à cause du logging
         console.error('Erreur audit log:', error);
       }
     }
     
     async getAuditLogs(filters: {
       userId?: string;
       action?: string;
       resource?: string;
       startDate?: Date;
       endDate?: Date;
       page?: number;
       limit?: number;
     }) {
       const { page = 1, limit = 50, ...where } = filters;
       
       const [logs, total] = await Promise.all([
         this.prisma.auditLog.findMany({
           where: {
             ...where,
             timestamp: {
               gte: filters.startDate,
               lte: filters.endDate,
             }
           },
           include: {
             user: {
               select: {
                 email: true,
                 firstName: true,
                 lastName: true,
               }
             }
           },
           orderBy: { timestamp: 'desc' },
           skip: (page - 1) * limit,
           take: limit,
         }),
         this.prisma.auditLog.count({ where })
       ]);
       
       return { logs, total, page, limit };
     }
   }
   ```

3. **Créer un intercepteur global**
   ```typescript
   // src/common/interceptors/audit-log.interceptor.ts
   import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
   import { Observable } from 'rxjs';
   import { tap, catchError } from 'rxjs/operators';
   import { AuditService } from '../services/audit.service';
   
   @Injectable()
   export class AuditLogInterceptor implements NestInterceptor {
     constructor(private auditService: AuditService) {}
     
     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       const request = context.switchToHttp().getRequest();
       const { method, url, user, ip } = request;
       
       // Actions à logger
       const auditActions = ['POST', 'PUT', 'DELETE', 'PATCH'];
       
       if (!auditActions.includes(method)) {
         return next.handle();
       }
       
       const action = this.getAction(method, url);
       const resource = this.getResource(url);
       
       return next.handle().pipe(
         tap(() => {
           // Succès
           this.auditService.log({
             userId: user?.id,
             action,
             resource,
             ipAddress: ip,
             userAgent: request.headers['user-agent'],
             success: true,
           });
         }),
         catchError((error) => {
           // Échec
           this.auditService.log({
             userId: user?.id,
             action,
             resource,
             ipAddress: ip,
             userAgent: request.headers['user-agent'],
             success: false,
             details: { error: error.message },
           });
           throw error;
         })
       );
     }
     
     private getAction(method: string, url: string): string {
       // Logique pour déterminer l'action
       if (url.includes('/login')) return 'LOGIN';
       if (url.includes('/logout')) return 'LOGOUT';
       if (url.includes('/users') && method === 'POST') return 'CREATE_USER';
       // ... etc
       return `${method}_${url.split('/')[2]?.toUpperCase() || 'UNKNOWN'}`;
     }
     
     private getResource(url: string): string {
       return url.split('/')[2] || 'unknown';
     }
   }
   ```

4. **Logger manuellement les actions critiques**
   ```typescript
   // Dans auth.controller.ts
   @Post('login')
   async login(@Body() loginDto: LoginDto, @Req() req: Request) {
     try {
       const result = await this.authService.login(loginDto);
       
       await this.auditService.log({
         userId: result.user.id,
         action: 'LOGIN',
         resource: 'auth',
         ipAddress: req.ip,
         userAgent: req.headers['user-agent'],
         success: true,
       });
       
       return result;
     } catch (error) {
       await this.auditService.log({
         action: 'LOGIN_FAILED',
         resource: 'auth',
         ipAddress: req.ip,
         userAgent: req.headers['user-agent'],
         success: false,
         details: { email: loginDto.email },
       });
       
       throw error;
     }
   }
   ```

5. **Créer un endpoint pour consulter les logs (SADMIN uniquement)**
   ```typescript
   @Get('audit/logs')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('SADMIN')
   async getAuditLogs(@Query() filters: any) {
     return this.auditService.getAuditLogs(filters);
   }
   ```

**Actions à logger obligatoirement** :
- ✅ Connexion/déconnexion
- ✅ Création/modification/suppression d'utilisateurs
- ✅ Changement de rôles/permissions
- ✅ Publication de résultats
- ✅ Upload de fichiers
- ✅ Accès aux données sensibles

**Validation** : Se connecter, créer un utilisateur, vérifier les logs en base.

---

## 🟢 PHASE 4 - VULNÉRABILITÉS FAIBLES

**Priorité** : Optionnel  
**Délai suggéré** : 90 jours  
**Impact** : Faible  
**Effort** : Faible

---

### 🟢 LOW-001 : Expiration des tokens JWT

**Statut actuel** : ⚠️ Acceptable (15min)  
**Effort estimé** : 5 minutes  
**Priorité** : Très faible

#### Analyse actuelle
```env
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

**15 minutes est acceptable** pour une API backend.

#### Recommandations selon le contexte

| Contexte | Access Token | Refresh Token | Justification |
|----------|-------------|---------------|---------------|
| API backend haute sécurité | 5-10 min | 1-3 jours | Données sensibles |
| API backend standard | 15-30 min | 7 jours | **✅ Actuel** |
| Application web | 30-60 min | 7-14 jours | Meilleure UX |
| Application mobile | 1-2 heures | 30 jours | Connexion rare |

**Action** : Garder les valeurs actuelles, documenter la politique.

---

### 🟢 LOW-002 : Absence de versioning de l'API

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 1-2 heures  
**Priorité** : Faible (mais recommandé)

#### Solution

1. **Ajouter le versioning**
   ```typescript
   // Dans main.ts
   app.setGlobalPrefix('api/v1'); // Au lieu de 'api'
   ```

2. **Toutes les routes deviennent**
   ```
   GET /api/v1/auth/login
   GET /api/v1/users
   GET /api/v1/publications/departments
   ```

3. **Pour une v2 future**
   ```typescript
   // Créer un nouveau module
   @Module({
     imports: [
       // Modules v2
     ],
   })
   export class AppV2Module {}
   
   // main.ts
   app.setGlobalPrefix('api/v1'); // Routes existantes
   // Monter AppV2Module sur /api/v2
   ```

**Impact** : Tous les clients (frontend) devront mettre à jour les URLs.

**Recommandation** : Faire maintenant avant que des clients ne dépendent de l'API.

---

### 🟢 LOW-003 : Variables d'environnement non validées au démarrage

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 2-3 heures  
**Priorité** : Faible-Moyenne

#### Solution avec Joi

1. **Installer Joi**
   ```bash
   npm install joi
   ```

2. **Créer le schéma de validation**
   ```typescript
   // src/config/env.validation.ts
   import * as Joi from 'joi';
   
   export const envValidationSchema = Joi.object({
     // Environnement
     NODE_ENV: Joi.string()
       .valid('development', 'production', 'test')
       .required(),
     
     // Base de données
     DATABASE_URL: Joi.string()
       .uri()
       .required(),
     
     // JWT
     JWT_SECRET: Joi.string()
       .min(32)
       .required(),
     JWT_REFRESH_SECRET: Joi.string()
       .min(32)
       .required(),
     JWT_EXPIRES_IN: Joi.string()
       .pattern(/^\d+[smhd]$/)
       .default('15m'),
     JWT_REFRESH_EXPIRES_IN: Joi.string()
       .pattern(/^\d+[smhd]$/)
       .default('7d'),
     
     // Serveur
     PORT: Joi.number()
       .port()
       .default(3001),
     
     // CORS
     CORS_ORIGINS: Joi.string()
       .required(),
     
     // Sécurité
     BCRYPT_ROUNDS: Joi.number()
       .min(10)
       .max(15)
       .default(12),
     
     // Redis (si implémenté)
     REDIS_HOST: Joi.string()
       .when('NODE_ENV', {
         is: 'production',
         then: Joi.required(),
         otherwise: Joi.optional().default('localhost'),
       }),
     REDIS_PORT: Joi.number()
       .port()
       .default(6379),
   });
   ```

3. **Configurer dans AppModule**
   ```typescript
   // app.module.ts
   import { envValidationSchema } from './config/env.validation';
   
   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: '.env',
         validationSchema: envValidationSchema,
         validationOptions: {
           abortEarly: false, // Afficher toutes les erreurs
           allowUnknown: true, // Autoriser variables non définies dans le schéma
         },
       }),
       // ... autres imports
     ],
   })
   ```

**Avantages** :
- ✅ Application refuse de démarrer si configuration invalide
- ✅ Messages d'erreur clairs
- ✅ Valeurs par défaut documentées
- ✅ Validation de format (URLs, ports, etc.)

**Validation** : Démarrer l'app sans JWT_SECRET → erreur claire.

---

### 🟢 LOW-004 : Pas de monitoring de sécurité actif

**Statut actuel** : ❌ Non implémenté  
**Effort estimé** : 4-8 heures  
**Priorité** : Faible (mais très recommandé pour production)

#### Solution avec Sentry

1. **Installer Sentry**
   ```bash
   npm install @sentry/node @sentry/integrations
   ```

2. **Configurer Sentry**
   ```typescript
   // src/config/sentry.config.ts
   import * as Sentry from '@sentry/node';
   import { ProfilingIntegration } from '@sentry/profiling-node';
   
   export function initSentry() {
     if (process.env.NODE_ENV === 'production') {
       Sentry.init({
         dsn: process.env.SENTRY_DSN,
         environment: process.env.NODE_ENV,
         integrations: [
           new ProfilingIntegration(),
         ],
         tracesSampleRate: 0.1, // 10% des transactions
         profilesSampleRate: 0.1,
         
         // Filtrer les données sensibles
         beforeSend(event) {
           // Ne pas envoyer les mots de passe
           if (event.request?.data) {
             delete event.request.data.password;
           }
           return event;
         },
       });
     }
   }
   ```

3. **Initialiser dans main.ts**
   ```typescript
   import { initSentry } from './config/sentry.config';
   
   async function bootstrap() {
     initSentry(); // Avant create app
     
     const app = await NestFactory.create(AppModule);
     // ... reste
   }
   ```

4. **Créer un filtre d'exceptions**
   ```typescript
   // src/common/filters/sentry-exception.filter.ts
   import { Catch, ArgumentsHost } from '@nestjs/common';
   import { BaseExceptionFilter } from '@nestjs/core';
   import * as Sentry from '@sentry/node';
   
   @Catch()
   export class SentryExceptionFilter extends BaseExceptionFilter {
     catch(exception: unknown, host: ArgumentsHost) {
       // Envoyer à Sentry
       Sentry.captureException(exception);
       
       // Traitement normal
       super.catch(exception, host);
     }
   }
   ```

5. **Appliquer globalement**
   ```typescript
   // main.ts
   const { httpAdapter } = app.get(HttpAdapterHost);
   app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
   ```

#### Alertes de sécurité à configurer

1. **Tentatives de connexion échouées répétées**
   ```typescript
   if (failedAttempts > 5) {
     Sentry.captureMessage('Possible brute force attack', {
       level: 'warning',
       tags: { 
         security: true,
         ip: req.ip,
         email: loginDto.email 
       }
     });
   }
   ```

2. **Accès non autorisé**
   ```typescript
   @Catch(ForbiddenException)
   export class SecurityFilter {
     catch(exception: ForbiddenException, host: ArgumentsHost) {
       const request = host.switchToHttp().getRequest();
       
       Sentry.captureMessage('Unauthorized access attempt', {
         level: 'warning',
         tags: { security: true },
         extra: {
           url: request.url,
           userId: request.user?.id,
           ip: request.ip,
         }
       });
     }
   }
   ```

3. **Upload suspect**
   ```typescript
   if (suspiciousFile) {
     Sentry.captureMessage('Suspicious file upload', {
       level: 'error',
       tags: { security: true, file_upload: true },
       extra: { 
         fileType: detectedType,
         userId: user.id 
       }
     });
   }
   ```

**Alternative** : Winston avec transport Slack/Email pour les alertes.

---

## 📊 RÉSUMÉ DES PRIORITÉS

### À faire AVANT production

| ID | Vulnérabilité | Effort | Impact |
|----|---------------|--------|--------|
| MED-003 | Timeouts requêtes | 2-3h | 🔴 HAUTE |
| MED-007 | Audit logging | 6-8h | 🔴 HAUTE (RGPD) |
| LOW-002 | Versioning API | 1-2h | 🟡 Recommandé |

### À faire dans les 30 jours

| ID | Vulnérabilité | Effort | Impact |
|----|---------------|--------|--------|
| MED-004 | Blacklist tokens | 4-6h | 🟡 Moyenne |
| MED-005 | Limite sessions | 2-3h | 🟡 Moyenne |
| MED-006 | Timing attacks | 1-2h | 🟢 Faible |
| LOW-003 | Validation env | 2-3h | 🟡 Recommandé |

### Optionnel (90 jours)

| ID | Vulnérabilité | Effort | Impact |
|----|---------------|--------|--------|
| MED-001 | CORS logging | 1-2h | 🟢 Faible |
| LOW-004 | Monitoring Sentry | 4-8h | 🟡 Recommandé prod |

---

## 🔄 MAINTENANCE CONTINUE

### Automatisations recommandées

1. **Dépendances**
   ```bash
   # Vérifier chaque semaine
   npm audit
   npm outdated
   
   # Automatiser avec Dependabot (GitHub)
   # ou Renovate (GitLab)
   ```

2. **Tests de sécurité**
   ```bash
   # Ajouter au CI/CD
   npm run verify:security
   npm audit --audit-level=high
   ```

3. **Scan de secrets**
   ```bash
   # Installer git-secrets
   git secrets --scan
   
   # Ou utiliser TruffleHog
   trufflehog filesystem .
   ```

4. **Analyse statique**
   ```bash
   # SonarQube pour analyse de code
   sonar-scanner
   ```

### Revues de sécurité périodiques

- **Mensuelle** : Review des logs d'audit
- **Trimestrielle** : Audit de sécurité complet
- **Semestrielle** : Test de pénétration (pentest)
- **Annuelle** : Mise à jour de l'analyse de risques

---

## 📈 ÉVOLUTION DU SCORE

| Phase | Score | Vulnérabilités restantes |
|-------|-------|-------------------------|
| Début | 4.5/10 | 19 |
| Phase 1+2 ✅ | 7.5/10 | 11 |
| Phase 3 🔄 | ~8.5/10 | 4 |
| Phase 4 🔄 | ~9.5/10 | 0 |

---

## 📞 RESSOURCES

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ANSSI - Sécurité](https://www.ssi.gouv.fr/)
- [NestJS Security](https://docs.nestjs.com/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Outils
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Dependabot](https://github.com/dependabot)
- [Sentry](https://sentry.io/)
- [SonarQube](https://www.sonarqube.org/)

---

**Créé le** : 9 octobre 2025  
**Prochaine révision** : 9 novembre 2025

