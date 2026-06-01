export interface CircuitBreakerOptions {
  /** Identificador da integração (logs, métricas). */
  name: string;
  /** Falhas consecutivas classificadas para abrir o circuito. */
  failureThreshold: number;
  /** Tempo em OPEN antes de permitir probes em HALF_OPEN (ms). */
  openDurationMs: number;
  /** Chamadas de teste permitidas em HALF_OPEN. */
  halfOpenMaxCalls: number;
  /** Timeout máximo da operação envolvida (ms). */
  operationTimeoutMs: number;
}
