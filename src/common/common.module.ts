import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { MonitoringService } from './services/monitoring.service';
import { AuditService } from './services/audit.service';
import { SessionService } from './services/session.service';
import { GracePeriodService } from './services/grace-period.service';

@Global()
@Module({
  providers: [CacheService, MonitoringService, AuditService, SessionService, GracePeriodService],
  exports: [CacheService, MonitoringService, AuditService, SessionService, GracePeriodService],
})
export class CommonModule {}
