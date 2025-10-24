import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthError } from '../auth/types/auth-error.types';

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur';
    let error = 'Internal Server Error';
    let detail = null;

    if (exception instanceof AuthError) {
      // Erreur d'authentification personnalisée
      const authError = exception.toResponse();
      status = authError.statusCode;
      message = authError.message;
      error = authError.error;
      detail = authError.detail;
    } else if (exception instanceof HttpException) {
      // Erreur HTTP standard de NestJS
      const httpException = exception as HttpException;
      status = httpException.getStatus();
      const responseBody = httpException.getResponse();
      
      if (typeof responseBody === 'object' && responseBody !== null) {
        message = (responseBody as any).message || httpException.message;
        error = (responseBody as any).error || 'Http Exception';
        detail = (responseBody as any).detail || null;
      } else {
        message = httpException.message;
        error = 'Http Exception';
      }
    } else if (exception instanceof Error) {
      // Erreur JavaScript standard
      message = exception.message;
      error = 'Error';
    }

    const errorResponse = {
      statusCode: status,
      message,
      error,
      ...(detail && { detail }),
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    };

    response.status(status).json(errorResponse);
  }
}
