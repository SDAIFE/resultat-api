# 🚨 DEMANDE URGENTE BACKEND - Augmenter Timeout Upload

**Date** : 10 octobre 2025  
**Priorité** : ⚠️ **CRITIQUE** - Bloque les uploads

---

## 🐛 PROBLÈME

### Frontend reçoit

```
❌ Erreur: La requête a expiré après 30 secondes
```

### Backend traite avec succès

```
✅ Statut de la CEL S011 mis à jour: I (Importé)
✅ Statut des imports mis à jour: COMPLETED pour 16 lignes
```

---

## 🔍 DIAGNOSTIC

Le **backend NestJS a un timeout de 30 secondes** configuré, qui coupe la connexion avant que le traitement soit terminé.

Le traitement complet prend **60-80 secondes** :
- Stockage fichiers : ~2s
- Parse CSV : ~5s
- Validation : ~10s
- Import 16 lignes : ~40s
- Mise à jour statuts : ~5s

**Total** : ~62s → Dépasse le timeout backend de 30s

---

## ✅ SOLUTION REQUISE

### Configuration Backend à modifier

**Fichier** : `main.ts` (fichier principal NestJS)

#### Si vous utilisez Express (NestExpressApplication)

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configuration CORS, etc...
  
  // ✅ SOLUTION : Augmenter le timeout du serveur HTTP
  const server = app.getHttpServer();
  server.setTimeout(180000); // 180 secondes (3 minutes)
  
  await app.listen(3001);
  
  console.log('✅ Serveur démarré avec timeout: 180 secondes');
}
bootstrap();
```

#### Si vous utilisez Fastify (NestFastifyApplication)

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ 
      connectionTimeout: 180000, // ✅ 3 minutes
      keepAliveTimeout: 180000,
    })
  );
  
  await app.listen(3001);
}
```

#### Configuration spécifique upload (Alternative)

Si vous voulez garder 30s pour les autres routes et seulement augmenter pour upload :

```typescript
// upload.controller.ts
@Post('excel')
@Header('Connection', 'keep-alive')
@Header('Keep-Alive', 'timeout=180')
async uploadExcel(...) {
  // Votre logique
}
```

**Mais recommandé** : Augmenter globalement à 180s (plus simple).

---

## 📋 ENDPOINTS CONCERNÉS

Tous les endpoints qui font du traitement long :

- `POST /api/v1/upload/excel` ⚠️ **CRITIQUE**
- `POST /api/v1/upload/cels`
- `POST /api/v1/upload/consolidation`
- Tout endpoint qui parse/traite des fichiers volumineux

---

## 🎯 VALEURS RECOMMANDÉES

| Endpoint | Timeout recommandé | Raison |
|----------|-------------------|--------|
| Auth, Get, Delete | 30s | Rapides |
| Upload simple | 60s | Upload sans traitement |
| **Upload + Traitement** | **180s** | Parse + Import |
| Exports, Rapports | 120s | Génération fichiers |

**Configuration globale** : 180s (couvre tous les cas)

---

## 🔄 ALTERNATIVE : Traitement Asynchrone

Si modifier le timeout n'est pas souhaitable, implémenter le traitement asynchrone :

**Voir** : `docs/RECOMMANDATION_BACKEND_ASYNC.md`

**Principe** :
1. Backend retourne immédiatement (< 5s)
2. Traitement en background (queue)
3. Frontend fait du polling pour vérifier le statut

**Avantage** : Pas de timeout, meilleure scalabilité

---

## 🆘 URGENCE

**Priorité** : ⚠️ **CRITIQUE**

Sans cette modification, **tous les uploads de fichiers échouent** côté utilisateur (même si le backend traite correctement).

**Impact utilisateur** :
- ❌ Erreur 500 affichée
- ❌ Impression que ça ne fonctionne pas
- ❌ Confusion (les données sont en base mais message d'erreur)

---

## ✅ CHECKLIST BACKEND

- [ ] Modifier le timeout global du serveur : 30s → 180s
- [ ] Redémarrer le serveur backend
- [ ] Tester un upload de fichier
- [ ] Vérifier que la réponse arrive avant timeout
- [ ] Confirmer au frontend que c'est fait

---

## 📞 CONTACT

**Frontend attend** : Confirmation de la modification  
**Délai** : Urgent - Bloquant pour les tests

---

**Créé le** : 10 octobre 2025  
**Version** : 1.0 - Demande urgente

