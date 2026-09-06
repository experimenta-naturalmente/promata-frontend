/**
 * Sinaliza que não foi possível determinar o estado da sessão (rede, throttling,
 * erro do servidor ou payload fora do contrato). Não significa que o usuário está
 * deslogado: apenas um `null` explícito de `getCurrentUserRequest` tem esse sentido.
 */
export class SessionUnavailableError extends Error {
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "session-unavailable-error";
    this.status = options?.status;
  }
}
