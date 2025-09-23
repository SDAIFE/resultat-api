import { Module } from '@nestjs/common';
import { CelsService } from './cels.service';
import { CelsController } from './cels.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CelsController],
  providers: [CelsService],
  exports: [CelsService],
})
export class CelsModule {}
