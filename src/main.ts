import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { StorageService } from './upload/storage.service';
import helmet from 'helmet';
import * as timeout from 'express-timeout-handler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 🗂️ Initialiser la structure de stockage des fichiers
  try {
    const storageService = app.get(StorageService);
    await storageService.initializeDirectories();
    console.log('✅ Structure de stockage initialisée');
  } catch (error) {
    console.warn('⚠️ Erreur lors de l\'initialisation du stockage:', error);
  }
  
  // 🔒 SÉCURITÉ : Timeout sur les requêtes (protection contre Slowloris)
  // ⚠️ Timeout augmenté à 180s pour supporter les uploads de fichiers volumineux
  app.use(timeout.handler({
    timeout: 180000, // 180 secondes (3 minutes) - Pour uploads et traitement
    onTimeout: (req, res) => {
      res.status(503).json({
        statusCode: 503,
        message: 'La requête a expiré après 180 secondes',
        error: 'Request Timeout',
        timestamp: new Date().toISOString(),
      });
    },
    onDelayedResponse: (req, method, args, requestTime) => {
      console.warn(`⚠️ Requête lente détectée: ${req.method} ${req.url} - ${requestTime}ms`);
    },
  }));

  // 🔒 SÉCURITÉ : Headers HTTP sécurisés avec Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 an
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }));
  
  // Configuration CORS pour plusieurs frontends
  console.log('🔍 DEBUG CORS_ORIGINS (raw):', process.env.CORS_ORIGINS);
  
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  console.log('🔍 DEBUG corsOrigins (after split):', corsOrigins);
  
  // 🔒 SÉCURITÉ : Validation stricte des origines CORS
  const validOrigins = corsOrigins.filter(origin => {
    try {
      const url = new URL(origin);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      console.error(`⚠️ Invalid CORS origin: ${origin}`);
      return false;
    }
  });
  
  console.log('🔍 DEBUG validOrigins (final):', validOrigins);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (ex: Postman, curl)
      if (!origin || validOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS rejected: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24h
  });
  
  // Ajouter le préfixe global 'api/v1' à toutes les routes (versioning)
  app.setGlobalPrefix('api/v1');
  
  // Activer la validation globale
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // 🔒 SÉCURITÉ : Forcer HTTPS en production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(301, `https://${req.header('host')}${req.url}`);
      }
      next();
    });
  }
  
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  
  // ⚠️ Augmenter le timeout du serveur HTTP sous-jacent pour les uploads volumineux
  const server = app.getHttpServer();
  server.setTimeout(180000); // 180 secondes (3 minutes)
  server.keepAliveTimeout = 185000; // 185 secondes (légèrement plus que setTimeout)
  server.headersTimeout = 190000; // 190 secondes (légèrement plus que keepAliveTimeout)
  
  console.log(`🚀 Application démarrée sur le port ${port}`);
  console.log(`📍 API versioning : /api/v1/*`);
  console.log(`🔒 Sécurité : Helmet activé`);
  console.log(`🔒 Sécurité : Rate limiting activé`);
  console.log(`🔒 Sécurité : Timeouts configurés (180s)`);
  console.log(`⏱️  Serveur HTTP timeout : 180s (3 minutes)`);
  console.log(`🔒 Sécurité : CORS configuré pour ${validOrigins.length} origine(s)`);
}
bootstrap();
