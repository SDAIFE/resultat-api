import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { MonitoringService } from './services/monitoring.service';

@Module({
  providers: [CacheService, MonitoringService],
  exports: [CacheService, MonitoringService],
})
export class CommonModule {}
