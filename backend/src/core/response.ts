export interface ApiMeta {
  total_count?: number;
  filter_count?: number;
}

export interface SuccessResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ErrorItem {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
}

export interface ErrorResponse {
  errors: ErrorItem[];
}

/**
 * Build a consistent success response envelope.
 */
export function success<T>(data: T, meta?: ApiMeta): SuccessResponse<T> {
  const response: SuccessResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

/**
 * Build a consistent error response envelope.
 */
export function error(message: string, code?: string, extensions?: Record<string, unknown>): ErrorResponse {
  return {
    errors: [
      {
        message,
        extensions: {
          ...(code ? { code } : {}),
          ...extensions,
        },
      },
    ],
  };
}
