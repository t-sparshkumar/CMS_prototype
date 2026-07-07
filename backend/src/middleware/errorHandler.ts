import type { NextFunction, Request, Response } from 'express';
import { error } from '../core/response.js';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Global Express error handler returning consistent error envelope.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(error(err.message, err.code));
    return;
  }

  if (err instanceof Error) {
    res.status(500).json(error(err.message, 'INTERNAL_ERROR'));
    return;
  }

  res.status(500).json(error('An unexpected error occurred', 'INTERNAL_ERROR'));
}
