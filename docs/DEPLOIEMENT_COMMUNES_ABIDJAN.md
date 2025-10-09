# Guide de Déploiement - Communes d'Abidjan

**Date** : 2025-10-09  
**Version** : 2.0.0  
**Priorité** : 🔴 **URGENTE** (Frontend en attente)

---

## 🎯 Situation actuelle

### ✅ CE QUI EST PRÊT

1. **Code backend** : ✅ Modifié, testé et validé
2. **Code compilé** : ✅ dist/ contient la nouvelle version
3. **Tests** : ✅ 14/14 tests passent (100%)
4. **Base de données** : ✅ Colonnes ajoutées (STAT_PUB, NUM_UTIL)
5. **Frontend** : ✅ Prêt et en attente du backend

### ❌ CE QUI MANQUE

1. **API déployée** : ❌ L'instance utilisée par le frontend n'est pas à jour
2. **Redémarrage** : ❌ Le serveur doit être redémarré avec le nouveau code

---

## 🔍 Diagnostic

Le frontend appelle l'API et reçoit :
```json
{
  "departments": [...],  // Ancien format
  "total": 112          // Ancienne valeur
}
```

Mais le code compilé retourne :
```javascript
return {
  entities: paginated,  // ✅ Nouveau format
  total: 125           // ✅ Nouvelle valeur
}
```

**Conclusion** : Le serveur tourne avec une **version non mise à jour**.

---

## 🚀 DÉPLOIEMENT ÉTAPE PAR ÉTAPE

### Étape 1 : Vérifier l'environnement

**Quel serveur le frontend appelle-t-il ?**

- [ ] **Local** (http://localhost:3001) → Suivre Section A
- [ ] **Render** (https://votre-app.onrender.com) → Suivre Section B
- [ ] **Autre** (VPS, etc.) → Suivre Section C

---

### 📍 Section A : Déploiement LOCAL

Si le frontend appelle `http://localhost:3001` ou `http://localhost:3000` :

```bash
# 1. Aller dans le dossier du projet
cd c:\Users\user\Documents\nextjs_project\resultat-api

# 2. S'assurer que le code est à jour
git status

# 3. Recompiler
npm run build

# 4. Démarrer en mode développement
npm run start:dev

# OU en mode production
npm run start:prod
```

**Vérification** :
```bash
# Dans un autre terminal
curl http://localhost:3001/api/publications/stats

# Si succès, l'API tourne
```

---

### 📍 Section B : Déploiement RENDER

Si vous utilisez Render (voir `render.yaml`) :

#### Option 1 : Déploiement automatique (Git Push)

```bash
# 1. Commiter les changements
git add .
git commit -m "feat: Implémentation publication par communes pour Abidjan"

# 2. Pousser vers GitHub
git push origin master

# 3. Render détectera le push et redéploiera automatiquement
# Attendez 3-5 minutes

# 4. Vérifier les logs sur le dashboard Render
```

#### Option 2 : Déploiement manuel

1. Aller sur https://dashboard.render.com
2. Sélectionner votre service `resultat-api`
3. Cliquer sur **"Manual Deploy"** → **"Deploy latest commit"**
4. Attendre la fin du build (3-5 minutes)
5. Vérifier les logs

#### Option 3 : Via l'API Render

```bash
# Déclencher un déploiement via webhook Render
curl -X POST "https://api.render.com/deploy/your-service-id?key=your-deploy-hook-key"
```

**Vérification après déploiement** :
```bash
curl https://votre-app.onrender.com/api/publications/stats

# Vérifier que l'API répond
```

---

### 📍 Section C : Autre serveur (VPS, etc.)

Si vous utilisez PM2, systemd ou autre :

#### Avec PM2
```bash
# SSH dans votre serveur
ssh user@votre-serveur

# Aller dans le dossier
cd /path/to/resultat-api

# Pull les derniers changements
git pull origin master

# Installer/mettre à jour les dépendances
npm install

# Appliquer les migrations Prisma
npx prisma db push --accept-data-loss
npx prisma generate

# Recompiler
npm run build

# Redémarrer avec PM2
pm2 restart resultat-api

# Vérifier les logs
pm2 logs resultat-api
```

#### Avec systemd
```bash
# Pull et compile
git pull && npm install && npm run build

# Redémarrer le service
sudo systemctl restart resultat-api

# Vérifier le status
sudo systemctl status resultat-api
```

---

## ✅ VÉRIFICATION POST-DÉPLOIEMENT

### Test 1 : API accessible
```bash
curl http://votre-api/api/publications/stats

# Attendu : Status 200 ou 401 (si auth requise)
```

### Test 2 : Total d'entités
```bash
# Avec un token valide
curl -X GET "http://votre-api/api/publications/departments?page=1&limit=1" \
  -H "Authorization: Bearer {token}" \
  | jq '.total'

# Résultat ATTENDU : 125
# Résultat ANCIEN : 112
```

### Test 3 : Champ entities
```bash
curl -X GET "http://votre-api/api/publications/departments?page=1&limit=1" \
  -H "Authorization: Bearer {token}" \
  | jq 'keys'

# Résultat ATTENDU : ["entities", "total", "page", "limit", "totalPages"]
# Résultat ANCIEN : ["departments", "total", "page", "limit", "totalPages"]
```

### Test 4 : Communes d'Abidjan
```bash
curl -X GET "http://votre-api/api/publications/departments?codeDepartement=022" \
  -H "Authorization: Bearer {token}" \
  | jq '.total'

# Résultat ATTENDU : 14
# Résultat ANCIEN : 1 (le département Abidjan)
```

### Test 5 : Type COMMUNE
```bash
curl -X GET "http://votre-api/api/publications/departments?codeDepartement=022" \
  -H "Authorization: Bearer {token}" \
  | jq '.entities[0].type'

# Résultat ATTENDU : "COMMUNE"
# Résultat ANCIEN : champ absent ou "DEPARTMENT"
```

---

## 🚨 Si les tests échouent après déploiement

### Problème : Total toujours 112

**Causes possibles** :
1. Ancienne instance toujours en cours
2. Cache du reverse proxy (Nginx, Cloudflare, etc.)
3. Mauvaise branche déployée

**Solutions** :
```bash
# Vérifier la branche
git branch

# Vérifier les modifications
git log --oneline -5

# Forcer le build
rm -rf dist/
npm run build

# Tuer tous les processus Node
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill -9 node

# Redémarrer
npm run start:prod
```

### Problème : Erreur de base de données

**Erreur** : `Column 'STAT_PUB' does not exist`

**Solution** :
```bash
# Appliquer les migrations
npx prisma db push --accept-data-loss

# Regénérer le client
npx prisma generate

# Redémarrer
```

### Problème : Champ "departments" au lieu de "entities"

**Cause** : Cache du client HTTP ou du navigateur

**Solution** :
```bash
# Vider le cache du navigateur
# Ou ajouter un paramètre de cache-busting
GET /api/publications/departments?_v=2
```

---

## 📞 Communication avec le Frontend

Une fois le déploiement réussi :

### Message à envoyer

```
✅ Backend déployé avec succès !

L'API retourne maintenant :
- 125 entités (111 départements + 14 communes Abidjan)
- Champ "entities" au lieu de "departments"  
- Type "COMMUNE" pour les communes d'Abidjan

Endpoints disponibles :
- GET /api/publications/departments → 125 entités
- GET /api/publications/departments?codeDepartement=022 → 14 communes
- POST /api/publications/communes/:id/publish → Publier une commune

Le frontend devrait maintenant fonctionner sans modification ! 🎉

Testez avec :
curl http://votre-api/api/publications/departments?page=1&limit=5

Documentation complète : docs/REPONSES_BACKEND_ABIDJAN_COMMUNES.md
```

---

## ⏱️ Estimation des temps

| Environnement | Temps de déploiement |
|---------------|---------------------|
| **Local** (npm start) | ~30 secondes |
| **Render** (auto-deploy) | 3-5 minutes |
| **VPS** (manuel) | 2-3 minutes |

---

## 🎯 Checklist finale

Après déploiement, cochez :

- [ ] API accessible (status 200 ou 401)
- [ ] Total = 125 (testé avec curl)
- [ ] Champ `entities` présent
- [ ] Type `COMMUNE` présent pour Abidjan
- [ ] Filtrage par codeDepartement=022 fonctionne
- [ ] Frontend notifié
- [ ] Tests end-to-end réussis

---

## 📚 Documentation

- **`REPONSES_BACKEND_ABIDJAN_COMMUNES.md`** - Réponses complètes aux questions frontend
- **`GUIDE_FRONTEND_ABIDJAN_COMMUNES.md`** - Guide d'intégration
- **`CHECKLIST_DEPLOIEMENT.md`** - Checklist détaillée

---

**Action immédiate** : Déployer le backend selon votre environnement (Section A, B ou C)

**Équipe Backend NestJS**  
**2025-10-09**

