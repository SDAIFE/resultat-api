#!/usr/bin/env ts-node

/**
 * Script de configuration de sécurité pour l'API Résultats Électoraux
 * 
 * Ce script aide à configurer les paramètres de sécurité pour :
 * - Connexion TLS/SSL à la base de données
 * - Validation des certificats
 * - Configuration des variables d'environnement
 */

import * as fs from 'fs';
import * as path from 'path';

const ENV_TEMPLATE = `# Configuration de la base de données
DATABASE_URL="sqlserver://LAP-4112-11:1433;database=BD_RESULTAT_PRESIDENTIELLE_2025;user=sa;password=ANder31@#.;trustServerCertificate=true" 

# Configuration JWT
JWT_SECRET="votre-secret-jwt-tres-securise-${generateRandomString(32)}"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="votre-refresh-secret-tres-securise-${generateRandomString(32)}"
JWT_REFRESH_EXPIRES_IN="7d"

# Configuration de l'application
NODE_ENV="development"
PORT=3000

# Configuration de sécurité
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600000

# Configuration des logs
LOG_LEVEL="info"
`;

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Le fichier .env existe déjà. Sauvegarde en cours...');
    const backupPath = path.join(process.cwd(), '.env.backup');
    fs.copyFileSync(envPath, backupPath);
    console.log(`✅ Sauvegarde créée : ${backupPath}`);
  }

  fs.writeFileSync(envPath, ENV_TEMPLATE);
  console.log('✅ Fichier .env créé avec des paramètres de sécurité');
}

function displaySecurityRecommendations(): void {
  console.log(`
🔒 RECOMMANDATIONS DE SÉCURITÉ
==============================

1. CONFIGURATION DE LA BASE DE DONNÉES :
   - Assurez-vous que votre serveur SQL Server supporte TLS/SSL
   - Configurez un certificat SSL valide sur le serveur
   - Utilisez 'encrypt=true' et 'trustServerCertificate=false'

2. SÉCURITÉ JWT :
   - Changez les secrets JWT par des valeurs uniques et sécurisées
   - Utilisez des durées d'expiration courtes pour les tokens d'accès
   - Stockez les secrets dans des variables d'environnement sécurisées

3. CONFIGURATION DE PRODUCTION :
   - Définissez NODE_ENV=production
   - Utilisez un gestionnaire de processus (PM2, Docker)
   - Configurez un reverse proxy (Nginx) avec SSL
   - Activez la rotation des logs

4. MONITORING :
   - Surveillez les requêtes lentes via /monitoring/stats
   - Configurez des alertes pour les erreurs de sécurité
   - Implémentez un système de logs centralisé

5. SÉCURITÉ RÉSEAU :
   - Utilisez un pare-feu pour limiter l'accès
   - Configurez des règles de rate limiting
   - Implémentez une authentification à deux facteurs
  `);
}

function main(): void {
  console.log('🚀 Configuration de la sécurité de l\'API Résultats Électoraux\n');
  
  try {
    createEnvFile();
    displaySecurityRecommendations();
    
    console.log('\n✅ Configuration terminée !');
    console.log('📝 N\'oubliez pas de :');
    console.log('   1. Modifier les paramètres de connexion à la base de données');
    console.log('   2. Configurer les certificats SSL sur votre serveur SQL Server');
    console.log('   3. Redémarrer l\'application pour appliquer les changements');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration :', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
