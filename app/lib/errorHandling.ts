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
 * Logging estructurado y conservador: útil para depurar sin exponer PII ni datos sensibles.
 * Solo imprime en consola en desarrollo.
 */
export function logError(context: string, err: unknown, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;

  const safe: Record<string, unknown> = {
    context,
    name: (err as any)?.name,
    message: (err as any)?.message,
    code: (err as any)?.code,
    ...extra,
  };

  // Evitar loguear objetos completos de Supabase que puedan incluir payloads o headers.
  // eslint-disable-next-line no-console
  console.error('APP_ERROR', safe);
}

