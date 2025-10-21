# 🚨 FIX RAPIDE - Erreur CORS Production

## ⚡ Solution en 3 minutes

### 1️⃣ Se connecter au serveur

```bash
ssh votre-utilisateur@votre-serveur
cd /var/www/apps/resultat-api
```

### 2️⃣ Modifier le fichier .env

```bash
nano .env
```

Chercher la ligne `CORS_ORIGINS` et ajouter l'URL Vercel :

**AVANT** :
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
```

**APRÈS** :
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,https://transmission-epr-app.vercel.app"
```

**💾 Sauvegarder** : `Ctrl + X`, puis `Y`, puis `Entrée`

### 3️⃣ Redémarrer l'API

```bash
pm2 restart resultat
```

### 4️⃣ Vérifier

```bash
pm2 logs resultat --lines 20
```

**Résultat attendu** : Plus d'erreur `CORS rejected`

---

## ✅ Commandes complètes (copier-coller)

Si vous préférez tout en une fois :

```bash
# Se connecter et naviguer
cd /var/www/apps/resultat-api

# Sauvegarder le fichier actuel (par sécurité)
cp .env .env.backup

# Ajouter l'URL Vercel (remplacer XXXX par vos URLs actuelles si différent)
sed -i 's|CORS_ORIGINS=".*"|CORS_ORIGINS="http://localhost:3000,http://localhost:3001,https://transmission-epr-app.vercel.app"|' .env

# Vérifier le changement
cat .env | grep CORS_ORIGINS

# Redémarrer
pm2 restart resultat

# Vérifier les logs
pm2 logs resultat --lines 20
```

---

## 🎯 Pour la production (recommandé)

Si vous voulez **seulement** autoriser Vercel (pas localhost) :

```bash
# Modifier .env
nano .env
```

Remplacer par :
```env
CORS_ORIGINS="https://transmission-epr-app.vercel.app"
```

Puis redémarrer :
```bash
pm2 restart resultat
```

---

## 📖 Documentation complète

Pour plus de détails : `docs/FIX_CORS_PRODUCTION.md`

---

**Temps estimé** : 3 minutes  
**Redémarrage requis** : Oui (PM2)  
**Impact** : Immédiat

