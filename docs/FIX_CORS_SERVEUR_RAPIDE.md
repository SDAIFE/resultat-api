# ⚡ FIX CORS Serveur - Commandes Rapides

## 🎯 Problème
CORS rejette `https://transmission-epr-app.vercel.app` malgré la configuration du `.env`

## ✅ Solution : Recompiler le code

Le problème vient du code **compilé** (`dist/`) qui ne lit pas correctement le `.env`.

---

## 🚀 Commandes à exécuter sur le serveur

### Option 1 : Tout-en-un (recommandé)

```bash
cd /var/www/apps/resultat-api && \
pm2 stop resultat && \
git pull origin master && \
npm install && \
npm run build && \
nano .env
```

**Dans nano** :
1. Vérifier que la ligne `CORS_ORIGINS` n'a **PAS d'espace** au début
2. Doit être exactement : `CORS_ORIGINS="https://transmission-epr-app.vercel.app,https://trans-re-epr.cei.ci"`
3. Sauvegarder : `Ctrl+X`, puis `Y`, puis `Entrée`

Puis :
```bash
pm2 restart resultat && \
pm2 logs resultat --lines 30
```

### Option 2 : Étape par étape

```bash
# 1. Aller dans le répertoire
cd /var/www/apps/resultat-api

# 2. Arrêter l'application
pm2 stop resultat

# 3. Récupérer le nouveau code (avec les logs debug)
git pull origin master

# 4. Installer les dépendances
npm install

# 5. Recompiler (IMPORTANT!)
npm run build

# 6. Vérifier le fichier .env
cat .env | grep CORS_ORIGINS

# Si vous voyez un espace avant CORS_ORIGINS, corrigez-le :
nano .env
# Retirer l'espace, sauvegarder

# 7. Redémarrer
pm2 restart resultat

# 8. Vérifier les logs
pm2 logs resultat --lines 30
```

---

## 🔍 Logs attendus après redémarrage

Vous devez voir ces lignes de débogage :

```
🔍 DEBUG CORS_ORIGINS (raw): https://transmission-epr-app.vercel.app,https://trans-re-epr.cei.ci
🔍 DEBUG corsOrigins (after split): [ 'https://transmission-epr-app.vercel.app', 'https://trans-re-epr.cei.ci' ]
🔍 DEBUG validOrigins (final): [ 'https://transmission-epr-app.vercel.app', 'https://trans-re-epr.cei.ci' ]
🔒 Sécurité : CORS configuré pour 2 origine(s)
```

---

## ❌ Si vous voyez ceci (MAUVAIS)

```
🔍 DEBUG CORS_ORIGINS (raw): undefined
🔍 DEBUG corsOrigins (after split): [ 'http://localhost:3000', 'http://localhost:3001' ]
```

**➡️ Le fichier `.env` n'est pas lu correctement**

### Solution rapide :

```bash
# Vérifier que le fichier .env existe
ls -la .env

# Recréer le fichier .env proprement
cat > .env << 'EOF'
DATABASE_URL="votre-connection-string-ici"
JWT_SECRET="votre-secret-ici"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="votre-refresh-secret-ici"
JWT_REFRESH_EXPIRES_IN="7d"
NODE_ENV="production"
PORT=3001
CORS_ORIGINS="https://transmission-epr-app.vercel.app,https://trans-re-epr.cei.ci"
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000
LOG_LEVEL="info"
EOF

# Redémarrer
pm2 restart resultat
pm2 logs resultat --lines 30
```

---

## ✅ Test final

### Test 1 : Vérifier les logs
```bash
pm2 logs resultat --lines 30
```
➡️ Vous devez voir les 3 lignes de debug CORS avec les bonnes URLs

### Test 2 : Depuis le frontend
1. Ouvrir `https://transmission-epr-app.vercel.app`
2. Essayer de se connecter
3. ✅ Ça doit fonctionner sans erreur CORS

---

## 📝 Résumé

**Pourquoi recompiler ?**
- Le code TypeScript dans `src/` est compilé en JavaScript dans `dist/`
- C'est le code dans `dist/` qui est exécuté par Node.js
- Si on change `src/main.ts`, il faut recompiler avec `npm run build`

**Étapes critiques :**
1. ✅ `git pull` - Récupérer le nouveau code avec les logs debug
2. ✅ `npm run build` - Recompiler le TypeScript
3. ✅ Vérifier le `.env` - Pas d'espace avant CORS_ORIGINS
4. ✅ `pm2 restart` - Redémarrer avec le nouveau code
5. ✅ Vérifier les logs debug - Les bonnes URLs doivent apparaître

---

**Temps estimé** : 5 minutes  
**Commande clé** : `npm run build`


