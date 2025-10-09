/**
 * Script de vérification des corrections de sécurité
 * 
 * Ce script vérifie que toutes les corrections de sécurité
 * Phase 1 (CRITIQUES) et Phase 2 (ÉLEVÉES) sont bien en place.
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  check: () => boolean;
  severity: 'CRITIQUE' | 'ÉLEVÉ';
}

const checks: SecurityCheck[] = [
  // ========== CRITIQUES ==========
  {
    id: 'CRIT-001',
    name: 'Secrets JWT sans valeur par défaut',
    description: 'Vérifie que les secrets JWT n\'ont pas de valeur par défaut',
    severity: 'CRITIQUE',
    check: () => {
      const authModulePath = path.join(process.cwd(), 'src/auth/auth.module.ts');
      const jwtStrategyPath = path.join(process.cwd(), 'src/auth/strategies/jwt.strategy.ts');
      
      const authModule = fs.readFileSync(authModulePath, 'utf-8');
      const jwtStrategy = fs.readFileSync(jwtStrategyPath, 'utf-8');
      
      // Vérifier qu'il n'y a pas de valeur par défaut pour JWT_SECRET
      const hasDefaultInModule = authModule.includes("|| 'your-secret-key'");
      const hasDefaultInStrategy = jwtStrategy.includes("|| 'your-secret-key'");
      
      // Vérifier qu'il y a bien une vérification
      const hasCheckInModule = authModule.includes('if (!secret)');
      const hasCheckInStrategy = jwtStrategy.includes('if (!secret)');
      
      return !hasDefaultInModule && !hasDefaultInStrategy && hasCheckInModule && hasCheckInStrategy;
    }
  },
  {
    id: 'CRIT-002',
    name: 'Injection SQL corrigée',
    description: 'Vérifie que $executeRawUnsafe n\'est plus utilisé de manière non sécurisée',
    severity: 'CRITIQUE',
    check: () => {
      const prismaServicePath = path.join(process.cwd(), 'src/database/prisma.service.ts');
      const prismaService = fs.readFileSync(prismaServicePath, 'utf-8');
      
      // Vérifier qu'il y a une validation des noms de tables
      const hasValidation = prismaService.includes('/^[a-zA-Z_][a-zA-Z0-9_]*$/');
      
      // Vérifier qu'il n'y a plus de TRUNCATE avec interpolation simple
      const hasUnsafeTruncate = prismaService.includes('TRUNCATE TABLE ${tables}');
      
      return hasValidation && !hasUnsafeTruncate;
    }
  },
  {
    id: 'CRIT-003',
    name: 'Endpoint /auth/register protégé',
    description: 'Vérifie que l\'endpoint register est protégé',
    severity: 'CRITIQUE',
    check: () => {
      const authControllerPath = path.join(process.cwd(), 'src/auth/auth.controller.ts');
      const authController = fs.readFileSync(authControllerPath, 'utf-8');
      
      // Trouver le decorateur @Post('register')
      const registerEndpointRegex = /@Post\('register'\)[\s\S]*?async register/;
      const match = authController.match(registerEndpointRegex);
      
      if (!match) return false;
      
      // Vérifier que dans ce bloc, il y a @UseGuards et @Roles
      const hasGuards = match[0].includes('@UseGuards');
      const hasRoles = match[0].includes('@Roles');
      
      return hasGuards && hasRoles;
    }
  },

  // ========== ÉLEVÉES ==========
  {
    id: 'HIGH-001',
    name: 'Rate Limiting configuré',
    description: 'Vérifie que ThrottlerModule est configuré',
    severity: 'ÉLEVÉ',
    check: () => {
      const appModulePath = path.join(process.cwd(), 'src/app.module.ts');
      const appModule = fs.readFileSync(appModulePath, 'utf-8');
      
      const hasThrottlerImport = appModule.includes('ThrottlerModule');
      const hasThrottlerConfig = appModule.includes('ThrottlerModule.forRoot');
      const hasThrottlerGuard = appModule.includes('ThrottlerGuard');
      
      return hasThrottlerImport && hasThrottlerConfig && hasThrottlerGuard;
    }
  },
  {
    id: 'HIGH-002',
    name: 'Validateur de mot de passe fort',
    description: 'Vérifie que le validateur de mot de passe fort existe',
    severity: 'ÉLEVÉ',
    check: () => {
      const validatorPath = path.join(process.cwd(), 'src/auth/decorators/is-strong-password.decorator.ts');
      
      if (!fs.existsSync(validatorPath)) return false;
      
      const validator = fs.readFileSync(validatorPath, 'utf-8');
      
      // Vérifier que le regex exige au moins 12 caractères
      const has12Chars = validator.includes('{12,}');
      const hasUppercase = validator.includes('(?=.*[A-Z])');
      const hasLowercase = validator.includes('(?=.*[a-z])');
      const hasDigit = validator.includes('(?=.*\\d)');
      const hasSpecial = validator.includes('(?=.*[@$!%*?&])');
      
      return has12Chars && hasUppercase && hasLowercase && hasDigit && hasSpecial;
    }
  },
  {
    id: 'HIGH-003',
    name: 'Helmet configuré',
    description: 'Vérifie que Helmet est configuré dans main.ts',
    severity: 'ÉLEVÉ',
    check: () => {
      const mainPath = path.join(process.cwd(), 'src/main.ts');
      const main = fs.readFileSync(mainPath, 'utf-8');
      
      const hasHelmetImport = main.includes("import helmet from 'helmet'") || main.includes('import * as helmet');
      const hasHelmetUse = main.includes('app.use(helmet');
      const hasHSTS = main.includes('hsts:');
      const hasCSP = main.includes('contentSecurityPolicy:');
      
      return hasHelmetImport && hasHelmetUse && hasHSTS && hasCSP;
    }
  },
  {
    id: 'HIGH-004',
    name: 'Upload de fichiers sécurisé',
    description: 'Vérifie que l\'upload utilise la validation magic bytes',
    severity: 'ÉLEVÉ',
    check: () => {
      const uploadControllerPath = path.join(process.cwd(), 'src/upload/upload.controller.ts');
      const uploadController = fs.readFileSync(uploadControllerPath, 'utf-8');
      
      const hasFileTypeImport = uploadController.includes('file-type');
      const hasFileTypeCheck = uploadController.includes('FileType.fromBuffer');
      const hasSizeLimit = uploadController.includes('10 * 1024 * 1024'); // 10MB
      const hasRandomName = uploadController.includes('crypto.randomBytes');
      const hasPathValidation = uploadController.includes('normalize(filePath)');
      
      return hasFileTypeImport && hasFileTypeCheck && hasSizeLimit && hasRandomName && hasPathValidation;
    }
  },
  {
    id: 'HIGH-005',
    name: 'Logs sanitisés en production',
    description: 'Vérifie que les logs sont configurés selon l\'environnement',
    severity: 'ÉLEVÉ',
    check: () => {
      const prismaServicePath = path.join(process.cwd(), 'src/database/prisma.service.ts');
      const prismaService = fs.readFileSync(prismaServicePath, 'utf-8');
      
      const hasEnvCheck = prismaService.includes("process.env.NODE_ENV === 'production'");
      const hasSanitizeMethod = prismaService.includes('sanitizeQuery');
      const hasPwdSanitization = prismaService.includes("password='***'");
      
      return hasEnvCheck && hasSanitizeMethod && hasPwdSanitization;
    }
  },
];

// ========== EXÉCUTION ==========

console.log('\n🔒 VÉRIFICATION DES CORRECTIONS DE SÉCURITÉ\n');
console.log('='.repeat(60));
console.log('\n');

let passed = 0;
let failed = 0;

const criticalChecks = checks.filter(c => c.severity === 'CRITIQUE');
const highChecks = checks.filter(c => c.severity === 'ÉLEVÉ');

// Vérifier les CRITIQUES
console.log('🔴 VULNÉRABILITÉS CRITIQUES\n');
criticalChecks.forEach(check => {
  try {
    const result = check.check();
    if (result) {
      console.log(`✅ ${check.id} - ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.id} - ${check.name}`);
      console.log(`   ⚠️  ${check.description}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.id} - ${check.name}`);
    console.log(`   ⚠️  Erreur: ${error.message}`);
    failed++;
  }
});

console.log('\n');

// Vérifier les ÉLEVÉES
console.log('🟠 VULNÉRABILITÉS ÉLEVÉES\n');
highChecks.forEach(check => {
  try {
    const result = check.check();
    if (result) {
      console.log(`✅ ${check.id} - ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.id} - ${check.name}`);
      console.log(`   ⚠️  ${check.description}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.id} - ${check.name}`);
    console.log(`   ⚠️  Erreur: ${error.message}`);
    failed++;
  }
});

console.log('\n');
console.log('='.repeat(60));
console.log('\n📊 RÉSUMÉ\n');
console.log(`   Tests réussis : ${passed}/${checks.length}`);
console.log(`   Tests échoués : ${failed}/${checks.length}`);
console.log(`   Score : ${Math.round((passed / checks.length) * 100)}%`);
console.log('\n');

if (failed === 0) {
  console.log('✅ Toutes les corrections de sécurité sont en place !');
  console.log('   Prêt pour le déploiement (Phase 1 + 2).\n');
  process.exit(0);
} else {
  console.log('❌ Certaines corrections sont manquantes.');
  console.log('   Veuillez corriger les problèmes ci-dessus.\n');
  process.exit(1);
}

