export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public status: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'No autenticado') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class CreditError extends AppError {
  constructor(message: string = 'Créditos insuficientes') {
    super(message, 'CREDIT_ERROR', 402);
    this.name = 'CreditError';
  }
}

export class AIError extends AppError {
  constructor(message: string = 'Error del servicio de IA') {
    super(message, 'AI_ERROR', 503);
    this.name = 'AIError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Datos inválidos') {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado';
}
