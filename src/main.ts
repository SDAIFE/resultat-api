import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as timeout from 'express-timeout-handler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 🔒 SÉCURITÉ : Timeout sur les requêtes (protection contre Slowloris)
  app.use(timeout.handler({
    timeout: 30000, // 30 secondes
    onTimeout: (req, res) => {
      res.status(503).json({
        statusCode: 503,
        message: 'La requête a expiré après 30 secondes',
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
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  
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
  
  console.log(`🚀 Application démarrée sur le port ${port}`);
  console.log(`📍 API versioning : /api/v1/*`);
  console.log(`🔒 Sécurité : Helmet activé`);
  console.log(`🔒 Sécurité : Rate limiting activé`);
  console.log(`🔒 Sécurité : Timeouts configurés (30s)`);
  console.log(`🔒 Sécurité : CORS configuré pour ${validOrigins.length} origine(s)`);
}
bootstrap();
