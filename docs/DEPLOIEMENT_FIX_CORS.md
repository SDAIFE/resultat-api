# 🚀 Déploiement du Fix CORS sur le Serveur

## 📋 Étapes à suivre

### 1️⃣ Sur votre machine locale

```bash
# S'assurer d'être sur la branche master
git status

# Ajouter les modifications
git add src/main.ts

# Commit
git commit -m "fix: Ajout logs debug CORS + correction configuration"

# Push vers le dépôt
git push origin master
```

### 2️⃣ Sur le serveur de production

```bash
# Se connecter au serveur
ssh votre-utilisateur@votre-serveur

# Naviguer vers le répertoire de l'API
cd /var/www/apps/resultat-api

# Arrêter l'application PM2
pm2 stop resultat-api

# Faire un backup du dossier dist actuel (par sécurité)
mv dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Récupérer les dernières modifications
git pull origin master

# Installer les dépendances (si nécessaire)
npm install

# Recompiler le projet TypeScript
npm run build

# Vérifier que le fichier .env existe et est correct
cat .env | grep CORS_ORIGINS

# Si la ligne CORS_ORIGINS a un espace, le corriger :
nano .env
# Retirer l'espace avant CORS_ORIGINS, sauvegarder (Ctrl+X, Y, Entrée)

# Redémarrer l'application
pm2 restart resultat-api

# Ou redémarrer avec le nom "resultat" si c'est le nom utilisé
pm2 restart resultat

# Suivre les logs en temps réel
pm2 logs resultat-api --lines 50
```

### 3️⃣ Vérifier les logs de débogage

Dans les logs PM2, vous devriez voir :

```
🔍 DEBUG CORS_ORIGINS (raw): https://transmission-epr-app.vercel.app,https://trans-re-epr.cei.ci
🔍 DEBUG corsOrigins (after split): [
  'https://transmission-epr-app.vercel.app',
  'https://trans-re-epr.cei.ci'
]
🔍 DEBUG validOrigins (final): [
  'https://transmission-epr-app.vercel.app',
  'https://trans-re-epr.cei.ci'
]
🔒 Sécurité : CORS configuré pour 2 origine(s)
```

**⚠️ Si vous voyez autre chose**, notez-le pour diagnostic.

### 4️⃣ Tester depuis le frontend

1. Ouvrir `https://transmission-epr-app.vercel.app`
2. Essayer de se connecter
3. Vérifier qu'il n'y a plus d'erreur CORS

---

## 🔧 Commandes rapides (tout-en-un)

Sur le serveur :

```bash
cd /var/www/apps/resultat-api && \
pm2 stop resultat-api && \
git pull origin master && \
npm install && \
npm run build && \
pm2 restart resultat-api && \
pm2 logs resultat-api --lines 30
```

---

## 🐛 Si le problème persiste

### Scénario 1 : Les logs montrent `undefined` pour CORS_ORIGINS

```
🔍 DEBUG CORS_ORIGINS (raw): undefined
```

**Solution** : Le fichier `.env` n'est pas chargé

```bash
# Vérifier que le fichier .env existe
ls -la .env

# Vérifier son contenu
cat .env

# Vérifier les permissions
chmod 600 .env

# S'assurer que dotenv est installé
npm list dotenv

# Redémarrer
pm2 restart resultat-api
```

### Scénario 2 : Les logs montrent les mauvaises origines

```
🔍 DEBUG validOrigins (final): ['http://localhost:3000', 'http://localhost:3001']
```

**Solution** : Le fichier `.env` a un problème de format

```bash
# Recréer le fichier .env sans espaces
cat > .env << 'EOF'
# Configuration de la base de données
DATABASE_URL="votre-connection-string"

# Configuration JWT
JWT_SECRET="votre-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="votre-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Configuration de l'application
NODE_ENV="production"
PORT=3001

# Configuration CORS
CORS_ORIGINS="https://transmission-epr-app.vercel.app,https://trans-re-epr.cei.ci"

# Configuration de sécurité
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000

# Configuration des logs
LOG_LEVEL="info"
EOF

# Redémarrer
pm2 restart resultat-api
```

### Scénario 3 : Le build échoue

```bash
# Nettoyer et reconstruire
rm -rf dist node_modules
npm install
npm run build

# Si ça échoue encore, vérifier les erreurs TypeScript
npm run build 2>&1 | tee build.log
```

---

## 📊 Vérification finale

Après déploiement, exécutez ces tests :

### Test 1 : Vérifier que l'API répond

```bash
curl -I https://votre-api.com/api/v1/auth/login
```

### Test 2 : Tester CORS avec curl

```bash
curl -I -X OPTIONS \
  -H "Origin: https://transmission-epr-app.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://votre-api.com/api/v1/auth/login
```

**Headers attendus** :
```
Access-Control-Allow-Origin: https://transmission-epr-app.vercel.app
Access-Control-Allow-Credentials: true
```

### Test 3 : Connexion depuis le frontend

1. Ouvrir le frontend
2. Ouvrir la console du navigateur (F12)
3. Essayer de se connecter
4. Vérifier qu'il n'y a pas d'erreur CORS

---

## 🗑️ Nettoyage après résolution

Une fois le problème résolu, vous pouvez retirer les logs de débogage :

### Sur votre machine locale

1. Éditer `src/main.ts`
2. Retirer les 3 lignes `console.log('🔍 DEBUG ...`
3. Commit et push
4. Redéployer sur le serveur

---

## 📝 Checklist de déploiement

- [ ] Code modifié et commité localement
- [ ] Push vers le dépôt Git
- [ ] Pull sur le serveur
- [ ] Application PM2 arrêtée
- [ ] Build executé (`npm run build`)
- [ ] Fichier `.env` vérifié (pas d'espace)
- [ ] Application redémarrée
- [ ] Logs vérifiés (debug CORS)
- [ ] Test frontend réussi
- [ ] Plus d'erreur CORS dans les logs

---

## 🆘 Besoin d'aide ?

Si après toutes ces étapes le problème persiste, envoyez-moi :

1. Le résultat de `cat .env | grep CORS_ORIGINS`
2. Les logs de démarrage complets (les 3 lignes de debug CORS)
3. Le message d'erreur exact du frontend

---

**Temps estimé** : 10-15 minutes  
**Redémarrage requis** : Oui  
**Build requis** : Oui

