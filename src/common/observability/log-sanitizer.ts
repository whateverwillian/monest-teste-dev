import { AxiosError } from 'axios';
import { CircuitBreakerOpenError } from '../circuit-breaker/circuit-breaker-open.error';
import { OperationTimeoutError } from '../circuit-breaker/operation-timeout.error';

/**
 * CEP não é dado altamente sensível, mas mascaramos por defesa em profundidade
 * (evita PII completo em agregadores de log).
 */
export function maskCep(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) {
    return '********';
  }
  return `${digits.slice(0, 3)}*****`;
}

/** Oculta CEP em paths como /cep/01310100 */
export function sanitizeRequestUrl(url: string): string {
  return url.replace(/\/cep\/[^/?]+/i, '/cep/******');
}

/** Apenas tipo do erro — sem message, stack ou corpo HTTP. */
export function getErrorKind(error: unknown): string {
  if (error instanceof OperationTimeoutError) {
    return 'operation_timeout';
  }
  if (error instanceof CircuitBreakerOpenError) {
    return 'circuit_open';
  }
  if (error instanceof AxiosError) {
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ERR_NETWORK'
    ) {
      return 'network_or_timeout';
    }
    const status = error.response?.status;
    if (status !== undefined) {
      return `http_${status}`;
    }
    return 'http_error';
  }
  if (error instanceof Error) {
    return error.name;
  }
  return 'unknown';
}
