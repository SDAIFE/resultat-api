import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from '../services/monitoring.service';

@Injectable()
export class PrismaMonitoringInterceptor implements NestInterceptor {
  constructor(private monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const executionTime = Date.now() - startTime;
        const request = context.switchToHttp().getRequest();
        
        // Enregistrer la métrique si c'est une requête Prisma
        if (request.prismaQuery) {
          this.monitoringService.recordQuery(request.prismaQuery, executionTime);
        }
      }),
    );
  }
}
