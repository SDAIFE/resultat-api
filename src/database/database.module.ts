import { Global, Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MonitoringService } from '../common/services/monitoring.service';

@Global()
@Module({
  providers: [PrismaService, MonitoringService],
  exports: [PrismaService, MonitoringService],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private prismaService: PrismaService,
    private monitoringService: MonitoringService,
  ) {}

  onModuleInit() {
    // Connecter le service de monitoring à Prisma
    this.prismaService.setMonitoringService(this.monitoringService);
  }
}
