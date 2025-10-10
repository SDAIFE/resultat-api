# 🚨 CORRECTION ERREUR CORS EN PRODUCTION

**Date** : 10 octobre 2025  
**Problème** : L'origine `https://transmission-epr-app.vercel.app` est rejetée par CORS  
**Priorité** : 🔴 **CRITIQUE** (Bloque l'accès frontend)

---

## 🔍 Diagnostic

### Erreur dans les logs PM2

```
⚠️ CORS rejected: https://transmission-epr-app.vercel.app
[Nest] ERROR [ExceptionsHandler] Error: Not allowed by CORS
```

### Cause

La variable d'environnement `CORS_ORIGINS` sur le serveur de production **ne contient pas** l'URL du frontend Vercel.

---

## ✅ Solution

### Étape 1 : Se connecter au serveur de production

```bash
ssh votre-utilisateur@votre-serveur
```

### Étape 2 : Naviguer vers le répertoire de l'API

```bash
cd /var/www/apps/resultat-api
```

### Étape 3 : Vérifier la configuration actuelle

```bash
cat .env | grep CORS_ORIGINS
```

**Réponse attendue (probablement)** :
```
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
```

### Étape 4 : Éditer le fichier `.env`

```bash
nano .env
```

ou

```bash
vim .env
```

### Étape 5 : Modifier la variable `CORS_ORIGINS`

**Avant** :
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
```

**Après** (ajouter l'URL Vercel) :
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,https://transmission-epr-app.vercel.app"
```

**⚠️ IMPORTANT** :
- Séparer les URLs par des **virgules** (`,`)
- **Pas d'espace** entre les URLs
- **Pas de slash** final (`/`) dans les URLs
- Utiliser les **guillemets doubles** (`"`)

### Étape 6 : Sauvegarder le fichier

- **Avec nano** : `Ctrl + X`, puis `Y`, puis `Entrée`
- **Avec vim** : `Esc`, puis `:wq`, puis `Entrée`

### Étape 7 : Redémarrer l'application avec PM2

```bash
pm2 restart resultat
```

ou redémarrer toutes les apps :

```bash
pm2 restart all
```

### Étape 8 : Vérifier les logs

```bash
pm2 logs resultat --lines 50
```

**Message attendu** :
```
🔒 Sécurité : CORS configuré pour 3 origine(s)
```

---

## 🧪 Tester la correction

### Test 1 : Depuis le frontend Vercel

1. Ouvrir `https://transmission-epr-app.vercel.app`
2. Essayer de se connecter
3. **Résultat attendu** : Connexion réussie sans erreur CORS

### Test 2 : Vérifier les logs PM2

```bash
pm2 logs resultat --lines 10
```

**Résultat attendu** : Plus d'erreur `CORS rejected`

### Test 3 : Test manuel avec curl

```bash
curl -I -X OPTIONS \
  -H "Origin: https://transmission-epr-app.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://votre-api.com/api/v1/auth/login
```

**Headers attendus dans la réponse** :
```
Access-Control-Allow-Origin: https://transmission-epr-app.vercel.app
Access-Control-Allow-Credentials: true
```

---

## 🌐 Configuration recommandée pour la production

### Option 1 : Production uniquement (recommandé)

Si le serveur de production n'a **pas besoin** de localhost :

```env
CORS_ORIGINS="https://transmission-epr-app.vercel.app"
```

### Option 2 : Production + localhost (pour debug)

Si vous avez besoin de tester depuis localhost en production :

```env
CORS_ORIGINS="http://localhost:3000,https://transmission-epr-app.vercel.app"
```

### Option 3 : Plusieurs domaines frontend

Si vous avez plusieurs applications frontend :

```env
CORS_ORIGINS="https://transmission-epr-app.vercel.app,https://admin-app.vercel.app,https://dashboard.votredomaine.com"
```

---

## 🔒 Sécurité

### ✅ Bonnes pratiques

- ✅ Utiliser **uniquement HTTPS** en production (`https://`)
- ✅ Spécifier **explicitement** chaque origine autorisée
- ✅ **Ne jamais** utiliser `*` (autoriser toutes les origines)
- ✅ Retirer les URLs de développement (`localhost`) en production

### ❌ À éviter

```env
# ❌ DANGEREUX - N'autoriser que les origines nécessaires
CORS_ORIGINS="*"

# ❌ INSECURE - Pas de HTTP en production
CORS_ORIGINS="http://transmission-epr-app.vercel.app"

# ❌ ERREUR - Espace entre les URLs
CORS_ORIGINS="https://app1.com, https://app2.com"

# ❌ ERREUR - Slash final
CORS_ORIGINS="https://app1.com/"
```

---

## 📋 Checklist de vérification

Après avoir modifié le fichier `.env` :

- [ ] La variable `CORS_ORIGINS` contient `https://transmission-epr-app.vercel.app`
- [ ] Les URLs sont séparées par des virgules (`,`)
- [ ] Pas d'espace entre les URLs
- [ ] Pas de slash final (`/`)
- [ ] PM2 redémarré : `pm2 restart resultat`
- [ ] Logs vérifiés : `pm2 logs resultat`
- [ ] Test frontend réussi
- [ ] Plus d'erreur CORS dans les logs

---

## 🆘 Dépannage

### Problème : L'erreur persiste après redémarrage

**Solution 1** : Vérifier que le fichier `.env` a bien été sauvegardé
```bash
cat .env | grep CORS_ORIGINS
```

**Solution 2** : Arrêter complètement PM2 et redémarrer
```bash
pm2 stop resultat
pm2 start resultat
```

**Solution 3** : Vérifier les logs en temps réel
```bash
pm2 logs resultat --lines 0
```
Puis essayer une requête depuis le frontend.

### Problème : Plusieurs domaines Vercel

Si vous avez plusieurs domaines pour le même projet Vercel (ex: preview, production) :

```env
CORS_ORIGINS="https://transmission-epr-app.vercel.app,https://transmission-epr-app-git-main.vercel.app,https://transmission-epr-app-preview.vercel.app"
```

### Problème : Sous-domaine wildcard

Si vous voulez autoriser tous les sous-domaines Vercel :

**⚠️ NON SUPPORTÉ** par la configuration actuelle. Il faut :
1. Soit lister tous les sous-domaines
2. Soit modifier le code pour utiliser une regex

---

## 🔧 Modification avancée (optionnel)

Si vous avez beaucoup de domaines Vercel et voulez simplifier :

### Modifier `src/main.ts`

Remplacer la logique CORS par une validation via regex :

```typescript
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true); // Autoriser sans origin (Postman, etc.)
    }
    
    // Vérifier si l'origine est dans la liste OU match le pattern Vercel
    const isValidOrigin = validOrigins.includes(origin) || 
                         /^https:\/\/transmission-epr-app.*\.vercel\.app$/.test(origin);
    
    if (isValidOrigin) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS rejected: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  // ... reste de la config
});
```

**⚠️ Attention** : Cette modification nécessite de recompiler le code (`npm run build`) et de redéployer.

---

## 📝 Notes

- **Fichier modifié** : `.env` (serveur de production uniquement)
- **Redémarrage requis** : Oui (PM2)
- **Impact** : Immédiat après redémarrage
- **Rétrocompatibilité** : Oui (ajoute une origine, n'en retire pas)

---

## 🎯 Résultat attendu

Après ces modifications :

✅ Le frontend Vercel peut communiquer avec l'API  
✅ Les requêtes CORS sont acceptées  
✅ Plus d'erreur dans les logs PM2  
✅ Connexion et toutes les fonctionnalités fonctionnent normalement  

---

**Créé le** : 10 octobre 2025  
**Priorité** : 🔴 **CRITIQUE**  
**Temps estimé** : 5 minutes

