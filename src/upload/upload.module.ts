import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ExcelAnalyzerService } from './excel-analyzer.service';
import { CsvAnalyzerService } from './csv-analyzer.service';
import { StorageService } from './storage.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UploadController],
  providers: [UploadService, ExcelAnalyzerService, CsvAnalyzerService, StorageService],
  exports: [UploadService, ExcelAnalyzerService, CsvAnalyzerService, StorageService],
})
export class UploadModule {}
