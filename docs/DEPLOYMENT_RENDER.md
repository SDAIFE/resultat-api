# 🚀 Déploiement sur Render.com

Ce document explique comment déployer l'API NestJS sur Render.com.

## 📋 Configuration Render

### 1. Variables d'environnement requises

Configurez les variables d'environnement suivantes dans le dashboard Render :

```env
# Base de données
DATABASE_URL=votre_url_postgresql

# JWT
JWT_SECRET=votre_secret_jwt_securise

# CORS
CORS_ORIGINS=https://votre-frontend.com,https://autre-frontend.com

# Node
NODE_ENV=production
```

### 2. Commandes de build et de démarrage

#### Build Command :
```bash
npm install && npx prisma generate && npm run build
```

#### Start Command :
```bash
npm run start:prod
```

> **Note** : Le script `start:prod` exécute : `node dist/src/main.js`

### 3. Configuration du service

- **Environment** : Node
- **Region** : Frankfurt (ou votre région préférée)
- **Plan** : Free ou Starter
- **Health Check Path** : `/api`

## 🔧 Résolution des problèmes

### Erreur : "Cannot find module '/opt/render/project/src/dist/src/main.js'"

**Cause** : Chemin incorrect vers le fichier principal compilé.

**Solution** : 
1. Vérifiez que `package.json` contient :
   ```json
   {
     "scripts": {
       "start:prod": "node dist/src/main.js"
     }
   }
   ```

2. Vérifiez que le build génère bien `dist/src/main.js` :
   ```bash
   npm run build
   ls -la dist/src/main.js
   ```

3. Sur Render, assurez-vous que :
   - Build Command : `npm install && npx prisma generate && npm run build`
   - Start Command : `npm run start:prod`

### Erreur de base de données

**Problème** : Prisma ne peut pas se connecter à la base de données.

**Solution** :
1. Créez une base PostgreSQL sur Render
2. Copiez l'URL de connexion interne (Internal Database URL)
3. Ajoutez-la comme variable d'environnement `DATABASE_URL`
4. Ajoutez `npx prisma generate` dans le Build Command
5. Pour les migrations, utilisez : `npx prisma migrate deploy` (en production)

### Port incorrect

Render assigne automatiquement le port via la variable `PORT`. 

Le code dans `src/main.ts` utilise déjà :
```typescript
await app.listen(process.env.PORT ?? 3001);
```

Ceci est correct pour Render.

## 📦 Structure de build

Après compilation, la structure est :

```
dist/
├── src/
│   ├── main.js          ← Point d'entrée de l'application
│   ├── app.module.js
│   └── ...
├── prisma/
└── scripts/
```

## 🔄 Déploiement automatique

Render déploie automatiquement à chaque push sur la branche principale (main/master).

Pour désactiver le déploiement auto :
1. Allez dans Settings
2. Désactivez "Auto-Deploy"

## 📊 Monitoring

- **Logs** : Accessible via le dashboard Render
- **Health Check** : Render ping `/api` régulièrement
- **Métriques** : CPU, RAM, requêtes disponibles dans le dashboard

## 🗃️ Base de données PostgreSQL sur Render

1. Créez une base PostgreSQL :
   - Dashboard → New → PostgreSQL
   - Choisissez le plan (Free pour test)
   
2. Connectez-la au service :
   - Copiez l'Internal Database URL
   - Ajoutez-la comme `DATABASE_URL`

3. Exécutez les migrations :
   ```bash
   # En local avec la DB de production (attention!)
   DATABASE_URL="votre_url" npx prisma migrate deploy
   
   # Ou via un script one-time sur Render
   ```

## 🔐 Sécurité

- ✅ N'exposez jamais `JWT_SECRET` ou `DATABASE_URL` dans le code
- ✅ Utilisez les variables d'environnement Render
- ✅ Activez HTTPS (automatique sur Render)
- ✅ Configurez CORS correctement avec `CORS_ORIGINS`

## 📝 Fichiers importants

- `package.json` : Scripts de build et démarrage
- `render.yaml` : Configuration automatique (optionnel)
- `prisma/schema.prisma` : Schéma de base de données
- `src/main.ts` : Point d'entrée avec configuration CORS et port

## 🆘 Support

En cas de problème :
1. Vérifiez les logs dans le dashboard Render
2. Testez le build localement : `npm run build && npm run start:prod`
3. Vérifiez les variables d'environnement
4. Consultez la documentation Render : https://render.com/docs

