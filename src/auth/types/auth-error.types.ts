export interface AuthErrorDetail {
  code: 'TOKEN_EXPIRED' | 'REFRESH_TOKEN_EXPIRED' | 'REFRESH_TOKEN_INVALID' | 'SESSION_INACTIVE' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'USER_NOT_FOUND' | 'INVALID_CREDENTIALS';
  reason: string;
  canRefresh: boolean;
}

export interface AuthErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  detail: AuthErrorDetail;
}

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public error: string,
    public detail: AuthErrorDetail,
  ) {
    super(message);
    this.name = 'AuthError';
  }

  toResponse(): AuthErrorResponse {
    return {
      statusCode: this.statusCode,
      message: this.message,
      error: this.error,
      detail: this.detail,
    };
  }
}

// Factory functions pour créer des erreurs d'authentification standardisées
export class AuthErrorFactory {
  static tokenExpired(): AuthError {
    return new AuthError(
      401,
      'Token d\'accès expiré',
      'Unauthorized',
      {
        code: 'TOKEN_EXPIRED',
        reason: 'Access token has expired',
        canRefresh: true,
      }
    );
  }

  static refreshTokenExpired(): AuthError {
    return new AuthError(
      401,
      'Refresh token expiré',
      'Unauthorized',
      {
        code: 'REFRESH_TOKEN_EXPIRED',
        reason: 'Refresh token has expired',
        canRefresh: false,
      }
    );
  }

  static refreshTokenInvalid(): AuthError {
    return new AuthError(
      401,
      'Refresh token invalide',
      'Unauthorized',
      {
        code: 'REFRESH_TOKEN_INVALID',
        reason: 'Refresh token not found or invalid',
        canRefresh: false,
      }
    );
  }

  static sessionInactive(): AuthError {
    return new AuthError(
      401,
      'Session expirée par inactivité',
      'Unauthorized',
      {
        code: 'SESSION_INACTIVE',
        reason: 'Session has expired due to inactivity',
        canRefresh: false,
      }
    );
  }

  static tokenMissing(): AuthError {
    return new AuthError(
      401,
      'Token d\'accès manquant',
      'Unauthorized',
      {
        code: 'TOKEN_MISSING',
        reason: 'Access token not provided',
        canRefresh: false,
      }
    );
  }

  static tokenInvalid(): AuthError {
    return new AuthError(
      401,
      'Token d\'accès invalide',
      'Unauthorized',
      {
        code: 'TOKEN_INVALID',
        reason: 'Access token is invalid',
        canRefresh: false,
      }
    );
  }

  static userNotFound(): AuthError {
    return new AuthError(
      401,
      'Utilisateur non trouvé',
      'Unauthorized',
      {
        code: 'USER_NOT_FOUND',
        reason: 'User not found or inactive',
        canRefresh: false,
      }
    );
  }

  static invalidCredentials(): AuthError {
    return new AuthError(
      401,
      'Identifiants invalides',
      'Unauthorized',
      {
        code: 'INVALID_CREDENTIALS',
        reason: 'Invalid email or password',
        canRefresh: false,
      }
    );
  }
}
