# Configuration CORS pour Applications Multiples

## Vue d'ensemble

Cette API backend est conçue pour communiquer avec plusieurs applications frontend. La configuration CORS permet de gérer les origines autorisées de manière flexible et sécurisée.

## Configuration actuelle

### Variables d'environnement

```env
# Liste des origines autorisées (séparées par des virgules)
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
```

### Configuration par défaut

Si `CORS_ORIGINS` n'est pas définie, les origines par défaut sont :
- `http://localhost:3000`
- `http://localhost:3001`

## Exemples de configuration

### Développement local
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
```

### Staging/Test
```env
CORS_ORIGINS="https://app1-staging.votredomaine.com,https://app2-staging.votredomaine.com"
```

### Production
```env
CORS_ORIGINS="https://app1.votredomaine.com,https://app2.votredomaine.com,https://admin.votredomaine.com"
```

## Applications frontend supportées

### Applications principales
1. **Application de gestion** - Port 3000
2. **Application d'administration** - Port 3001
3. **Application mobile (si applicable)** - Port 3002

### Ajout d'une nouvelle application

Pour ajouter une nouvelle application frontend :

1. **Développement** : Ajoutez l'URL locale à `CORS_ORIGINS`
   ```env
   CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002"
   ```

2. **Production** : Ajoutez l'URL de production
   ```env
   CORS_ORIGINS="https://app1.votredomaine.com,https://app2.votredomaine.com,https://app3.votredomaine.com"
   ```

3. **Redémarrez** l'application backend

## Méthodes HTTP autorisées

- `GET` - Lecture de données
- `POST` - Création de ressources
- `PUT` - Mise à jour complète
- `DELETE` - Suppression de ressources
- `PATCH` - Mise à jour partielle
- `OPTIONS` - Requêtes preflight CORS

## En-têtes autorisés

- `Content-Type` - Type de contenu
- `Authorization` - Tokens d'authentification
- `Accept` - Types de réponse acceptés

## Authentification

Les credentials sont activés (`credentials: true`), ce qui permet :
- Envoi de cookies d'authentification
- Utilisation des tokens JWT
- Sessions persistantes

## Sécurité

### Bonnes pratiques

1. **Environnement de production** : Utilisez toujours HTTPS
2. **Origines spécifiques** : Évitez les wildcards (`*`) en production
3. **Validation** : Vérifiez régulièrement la liste des origines autorisées

### Exemple de configuration sécurisée
```env
# Production - URLs spécifiques uniquement
CORS_ORIGINS="https://app1.votredomaine.com,https://app2.votredomaine.com"

# Évitez ceci en production :
# CORS_ORIGINS="*"
```

## Dépannage

### Erreurs CORS communes

1. **"Access to fetch at ... has been blocked by CORS policy"**
   - Vérifiez que l'origine de votre frontend est dans `CORS_ORIGINS`
   - Redémarrez le backend après modification

2. **"Preflight request doesn't pass access control check"**
   - Vérifiez que la méthode HTTP est autorisée
   - Vérifiez les en-têtes utilisés

3. **Credentials non envoyés**
   - Vérifiez que `credentials: 'include'` est configuré côté frontend
   - Vérifiez que `credentials: true` est activé côté backend

### Test de la configuration

Utilisez le script de test pour vérifier la configuration :
```bash
npx ts-node scripts/test-cors.ts
```

## Contact

Pour toute question sur la configuration CORS, contactez l'équipe backend.

---

**Note** : Cette configuration est dynamique et se met à jour au redémarrage de l'application. Aucun redémarrage n'est nécessaire pour les modifications côté frontend.
