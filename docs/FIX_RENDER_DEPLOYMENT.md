# 🔧 Solution : Erreur de déploiement sur Render.com

## ❌ Erreur rencontrée

```
Error: Cannot find module '/opt/render/project/src/dist/src/main.js'
```

## ✅ Solution

L'erreur indique que Render cherche le fichier au mauvais endroit. Voici les étapes pour corriger :

### 1. Vérifier le script `start:prod` dans `package.json`

✅ **CORRECT** (déjà corrigé) :
```json
{
  "scripts": {
    "start:prod": "node dist/src/main.js"
  }
}
```

❌ **INCORRECT** (ancien) :
```json
{
  "scripts": {
    "start:prod": "node dist/src/main"  // Manque .js
  }
}
```

### 2. Configuration sur Render.com Dashboard

Allez dans votre service sur Render et configurez :

#### **Build Command** :
```bash
npm install && npx prisma generate && npm run build
```

#### **Start Command** :
```bash
npm run start:prod
```

> ⚠️ **Important** : N'utilisez PAS `node dist/src/main.js` directement dans Start Command. Utilisez toujours `npm run start:prod`.

### 3. Variables d'environnement à configurer

Dans l'onglet "Environment" de votre service Render :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NODE_ENV` | `production` | Mode de production |
| `DATABASE_URL` | `postgresql://...` | URL de votre base PostgreSQL |
| `JWT_SECRET` | `votre-secret-securise` | Secret pour JWT |
| `CORS_ORIGINS` | `https://votre-frontend.com` | Origins autorisées pour CORS |
| `PORT` | (auto) | Render le définit automatiquement |

### 4. Structure des fichiers après build

La structure compilée doit être :

```
projet/
├── dist/
│   ├── src/
│   │   ├── main.js       ← C'est ce fichier que nous exécutons
│   │   ├── app.module.js
│   │   └── ...
│   ├── prisma/
│   └── scripts/
├── node_modules/
├── package.json
└── ...
```

### 5. Vérification en local

Avant de déployer, testez en local :

```powershell
# 1. Build
npm run build

# 2. Vérifier que le fichier existe
Test-Path dist/src/main.js
# Devrait retourner: True

# 3. Tester le démarrage
npm run start:prod
```

Si cela fonctionne en local, cela devrait fonctionner sur Render.

## 🐛 Causes possibles de l'erreur

### Cause 1 : Mauvais Start Command
- ❌ Start Command : `node src/dist/src/main.js` (chemin incorrect)
- ✅ Start Command : `npm run start:prod`

### Cause 2 : Build échoué
Si le build échoue, le fichier `dist/src/main.js` n'existe pas.

**Solution** : Vérifiez les logs de build sur Render pour voir si :
- `npm install` a réussi
- `npx prisma generate` a réussi
- `npm run build` a réussi

### Cause 3 : Prisma non généré
Si Prisma n'est pas généré, le build peut échouer.

**Solution** : Ajoutez `npx prisma generate` dans le Build Command :
```bash
npm install && npx prisma generate && npm run build
```

### Cause 4 : Variables d'environnement manquantes
Si `DATABASE_URL` est manquante, Prisma peut échouer.

**Solution** : Configurez toutes les variables d'environnement requises.

## 📋 Checklist de déploiement

- [ ] `package.json` contient `"start:prod": "node dist/src/main.js"`
- [ ] Build Command : `npm install && npx prisma generate && npm run build`
- [ ] Start Command : `npm run start:prod`
- [ ] Variable `DATABASE_URL` configurée
- [ ] Variable `JWT_SECRET` configurée
- [ ] Variable `NODE_ENV=production` configurée
- [ ] Variable `CORS_ORIGINS` configurée avec l'URL de votre frontend
- [ ] Base PostgreSQL créée sur Render et connectée
- [ ] Health Check Path : `/api`

## 🔄 Après modification

1. **Sauvegardez les changements** sur Render
2. **Redéployez manuellement** :
   - Cliquez sur "Manual Deploy" → "Deploy latest commit"
3. **Surveillez les logs** pour vérifier que :
   - Le build se termine avec succès
   - L'application démarre sans erreur
   - Le serveur écoute sur le bon port

## 📊 Vérification du déploiement

Une fois déployé, testez votre API :

```bash
# Remplacez par votre URL Render
curl https://votre-app.onrender.com/api

# Devrait retourner la réponse de la route racine
```

## 🆘 Si le problème persiste

1. **Vérifiez les logs de déploiement** sur Render :
   - Allez dans "Logs"
   - Cherchez les erreurs pendant le build ou le démarrage

2. **Vérifiez que le fichier est généré** :
   - Dans les logs de build, cherchez : "Build successful"
   - Vérifiez qu'il n'y a pas d'erreurs TypeScript

3. **Testez en local** avec les mêmes commandes :
   ```powershell
   npm install
   npx prisma generate
   npm run build
   npm run start:prod
   ```

4. **Contactez le support Render** avec :
   - Les logs complets
   - La configuration de votre service
   - Le contenu de `package.json`

## ✅ Résultat attendu

Après avoir appliqué ces corrections, vous devriez voir dans les logs Render :

```
==> Starting service with 'npm run start:prod'

> resultat-api@0.0.1 start:prod
> node dist/src/main.js

[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
...
[Nest] INFO Application is running on: http://0.0.0.0:10000
```

Votre API sera alors accessible via l'URL fournie par Render.

