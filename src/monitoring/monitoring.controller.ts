import { Controller, Get, UseGuards } from '@nestjs/common';
import { MonitoringService, QueryMetrics } from '../common/services/monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  @Get('stats')
  getStats(): {
    totalQueries: number;
    slowQueries: QueryMetrics[];
    mostFrequent: QueryMetrics[];
    averageExecutionTime: number;
  } {
    return this.monitoringService.getQueryStats();
  }

  @Get('report')
  getReport() {
    return {
      report: this.monitoringService.getPerformanceReport(),
    };
  }

  @Get('reset')
  resetMetrics() {
    this.monitoringService.resetMetrics();
    return { message: 'Métriques réinitialisées avec succès' };
  }
}
