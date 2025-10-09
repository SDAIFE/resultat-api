import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditController],
})
export class AuditModule {}

