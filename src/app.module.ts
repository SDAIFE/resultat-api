import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartementsModule } from './departements/departements.module';
import { CelsModule } from './cels/cels.module';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { RolesModule } from './roles/roles.module';
import { PublicationModule } from './publication/publication.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Protection contre les attaques par force brute et DoS
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 60 secondes
      limit: 100,  // 100 requêtes max par minute (global)
    }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DepartementsModule,
    CelsModule,
    UploadModule,
    DashboardModule,
    MonitoringModule,
    RolesModule,
    PublicationModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Applique le rate limiting globalement à toutes les routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
