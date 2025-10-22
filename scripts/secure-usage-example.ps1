# ===========================================
# 🔐 EXEMPLE D'UTILISATION SÉCURISÉE DU SCRIPT
# ===========================================
# Ce script montre comment utiliser le script de déploiement
# de manière sécurisée avec SecureString
# ===========================================

Write-Host "🔐 EXEMPLE D'UTILISATION SÉCURISÉE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Méthode 1 : Demande interactive (RECOMMANDÉE)
Write-Host "✅ MÉTHODE 1 : Demande interactive (RECOMMANDÉE)" -ForegroundColor Green
Write-Host "Le mot de passe sera demandé de manière sécurisée :" -ForegroundColor White
Write-Host ".\scripts\deploy-optimizations.ps1" -ForegroundColor Gray
Write-Host ""

# Méthode 2 : Avec SecureString
Write-Host "✅ MÉTHODE 2 : Avec SecureString" -ForegroundColor Green
Write-Host "Si vous avez déjà un SecureString :" -ForegroundColor White
Write-Host '$securePassword = ConvertTo-SecureString "MonMotDePasse" -AsPlainText -Force' -ForegroundColor Gray
Write-Host '.\scripts\deploy-optimizations.ps1 -DBPassword $securePassword' -ForegroundColor Gray
Write-Host ""

# Méthode 3 : Lecture depuis un fichier chiffré
Write-Host "✅ MÉTHODE 3 : Lecture depuis un fichier chiffré" -ForegroundColor Green
Write-Host "Pour un environnement de production :" -ForegroundColor White
Write-Host '$securePassword = Get-Content "password.txt" | ConvertTo-SecureString' -ForegroundColor Gray
Write-Host '.\scripts\deploy-optimizations.ps1 -DBPassword $securePassword' -ForegroundColor Gray
Write-Host ""

# Méthode 4 : Variables d'environnement (moins sécurisée)
Write-Host "⚠️  MÉTHODE 4 : Variables d'environnement (moins sécurisée)" -ForegroundColor Yellow
Write-Host "Pour les environnements de développement :" -ForegroundColor White
Write-Host '$env:DB_PASSWORD = "MonMotDePasse"' -ForegroundColor Gray
Write-Host '$securePassword = ConvertTo-SecureString $env:DB_PASSWORD -AsPlainText -Force' -ForegroundColor Gray
Write-Host '.\scripts\deploy-optimizations.ps1 -DBPassword $securePassword' -ForegroundColor Gray
Write-Host ""

# Exemples d'utilisation avec différents paramètres
Write-Host "📋 EXEMPLES D'UTILISATION :" -ForegroundColor Blue
Write-Host ""

Write-Host "1. Déploiement standard (localhost) :" -ForegroundColor White
Write-Host "   .\scripts\deploy-optimizations.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Déploiement sur serveur distant :" -ForegroundColor White
Write-Host "   .\scripts\deploy-optimizations.ps1 -DBHost '192.168.1.100'" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Déploiement sans tests :" -ForegroundColor White
Write-Host "   .\scripts\deploy-optimizations.ps1 -SkipTests" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Déploiement avec paramètres complets :" -ForegroundColor White
Write-Host "   .\scripts\deploy-optimizations.ps1 -DBHost '192.168.1.100' -DBPort 1433 -DBName 'resultat_api' -DBUser 'sa'" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Afficher l'aide :" -ForegroundColor White
Write-Host "   .\scripts\deploy-optimizations.ps1 -h" -ForegroundColor Gray
Write-Host ""

# Bonnes pratiques
Write-Host "🛡️  BONNES PRATIQUES DE SÉCURITÉ :" -ForegroundColor Red
Write-Host ""
Write-Host "✅ Utilisez toujours SecureString pour les mots de passe" -ForegroundColor Green
Write-Host "✅ Ne stockez jamais les mots de passe en texte clair" -ForegroundColor Green
Write-Host "✅ Utilisez l'authentification Windows quand possible" -ForegroundColor Green
Write-Host "✅ Limitez les permissions de l'utilisateur de base de données" -ForegroundColor Green
Write-Host "✅ Surveillez les accès à la base de données" -ForegroundColor Green
Write-Host ""
Write-Host "❌ N'utilisez jamais de mots de passe en texte clair" -ForegroundColor Red
Write-Host "❌ Ne commitez jamais de fichiers contenant des mots de passe" -ForegroundColor Red
Write-Host "❌ Ne partagez pas les mots de passe par email/chat" -ForegroundColor Red
Write-Host ""

Write-Host "🔒 Le script nettoie automatiquement le mot de passe de la mémoire" -ForegroundColor Cyan
Write-Host "   à la fin de l'exécution pour éviter les fuites de données." -ForegroundColor Cyan
