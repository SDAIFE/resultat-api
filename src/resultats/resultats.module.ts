import { Module } from '@nestjs/common';
import { ResultatsService } from './resultats.service';
import { ResultatsController } from './resultats.controller';
import { CacheService } from './cache.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ResultatsController],
  providers: [ResultatsService, CacheService],
  exports: [ResultatsService, CacheService],
})
export class ResultatsModule {}
