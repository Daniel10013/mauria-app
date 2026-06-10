/**
 * Tipo de retorno padrão para Server Actions e Route Handlers (ver convenção
 * "Padrão de Erro" no prompt-mestre).
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: string): Result<never> => ({ ok: false, error });
