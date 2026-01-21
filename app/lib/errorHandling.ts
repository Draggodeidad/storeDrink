export type PublicError = { success: false; error: string };

const DEFAULT_PUBLIC_ERROR = 'Ocurrió un error. Por favor, intenta de nuevo.';

/**
 * Devuelve un mensaje seguro para UI (sin filtrar detalles internos de Supabase/PostgREST).
 */
export function toPublicErrorMessage(_err: unknown, fallback: string = DEFAULT_PUBLIC_ERROR): string {
  // En el futuro se pueden mapear códigos específicos a mensajes user-friendly,
  // pero nunca retornamos err.message directo para evitar fugas de info interna.
  return fallback;
}

/**
 * Campos sensibles que deben ser filtrados de los logs.
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'bearer',
  'credential',
  'session',
  'cookie',
  'jwt',
];

/**
 * Sanitiza un valor para logging, eliminando información sensible.
 */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Truncar strings largos que puedan contener payloads
  if (typeof value === 'string') {
    const maxLength = 200;
    if (value.length > maxLength) {
      return value.substring(0, maxLength) + '... [truncado]';
    }
    // Reemplazar valores que parezcan tokens/secrets
    if (/^[A-Za-z0-9_\-]{20,}$/.test(value)) {
      return '[REDACTED_TOKEN]';
    }
    return value;
  }

  // Sanitizar objetos recursivamente
  if (typeof value === 'object' && !Array.isArray(value)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      // Filtrar campos sensibles
      if (SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }

  // Sanitizar arrays
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  return value;
}

/**
 * Logging estructurado y conservador: útil para depurar sin exponer PII ni datos sensibles.
 * Solo imprime en consola en desarrollo.
 */
export function logError(context: string, err: unknown, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;

  // Extraer solo información básica del error, sanitizada
  const errorMessage = (err as any)?.message;
  const sanitizedMessage = typeof errorMessage === 'string' 
    ? sanitizeValue(errorMessage) 
    : 'Error sin mensaje';

  const safe: Record<string, unknown> = {
    context,
    name: (err as any)?.name,
    message: sanitizedMessage,
    code: (err as any)?.code,
  };

  // Sanitizar datos extra antes de loguearlos
  if (extra) {
    safe.extra = sanitizeValue(extra);
  }

  // Evitar loguear objetos completos de Supabase que puedan incluir payloads o headers.
  // eslint-disable-next-line no-console
  console.error('APP_ERROR', safe);
}

