import { Module } from '@nestjs/common';
import { ResultatsService } from './resultats.service';
import { ResultatsController } from './resultats.controller';
import { CacheService } from './cache.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ResultatsController],
  providers: [ResultatsService, CacheService],
  exports: [ResultatsService, CacheService],
})
export class ResultatsModule {}
