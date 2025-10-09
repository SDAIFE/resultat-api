import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { MonitoringService } from './services/monitoring.service';
import { AuditService } from './services/audit.service';

@Global()
@Module({
  providers: [CacheService, MonitoringService, AuditService],
  exports: [CacheService, MonitoringService, AuditService],
})
export class CommonModule {}
