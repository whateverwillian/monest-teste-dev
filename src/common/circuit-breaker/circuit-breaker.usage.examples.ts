/**
 * EXEMPLOS DE USO — não executados em runtime de produção.
 *
 * Demonstra como o circuit breaker genérico se combina com integrações
 * via IFailureClassifier e padrão Decorator.
 */

import { CircuitBreaker } from './circuit-breaker';
import { HttpStatusFailureClassifier } from './classifiers/http-status.failure-classifier';
import { CircuitState } from './circuit-breaker-state.enum';

// --- Exemplo 1: integração HTTP genérica ---
async function exampleHttpIntegration(): Promise<void> {
  const paymentApiBreaker = new CircuitBreaker(
    {
      name: 'payment-gateway',
      failureThreshold: 5,
      openDurationMs: 30_000,
      halfOpenMaxCalls: 1,
      operationTimeoutMs: 10_000,
    },
    new HttpStatusFailureClassifier(),
  );

  await paymentApiBreaker.execute(async () => {
    // const response = await httpClient.post('/charge', payload);
    // return response.data;
    return { charged: true };
  });
}

// --- Exemplo 2: Decorator no nível provider (padrão CEP) ---
// Ver CepCircuitBreakerProvider — envolve delegate.fetchByCep(cep):
//
// fetchByCep(cep: string) {
//   return this.circuitBreaker.execute(() => this.delegate.fetchByCep(cep));
// }

// --- Exemplo 3: ciclo de estados (simulação) ---
async function exampleStateCycle(): Promise<void> {
  const breaker = new CircuitBreaker(
    {
      name: 'demo',
      failureThreshold: 2,
      openDurationMs: 1_000,
      halfOpenMaxCalls: 1,
      operationTimeoutMs: 5_000,
    },
    new HttpStatusFailureClassifier(),
  );

  const fail = () => Promise.reject(new Error('down'));

  try {
    await breaker.execute(fail);
  } catch {
    /* expected */
  }
  try {
    await breaker.execute(fail);
  } catch {
    /* expected */
  }

  // CLOSED → OPEN (após 2 falhas)
  console.log(breaker.getState()); // OPEN

  await new Promise((r) => setTimeout(r, 1_100));

  // OPEN → HALF_OPEN → CLOSED (probe com sucesso)
  await breaker.execute(async () => 'ok');
  console.log(breaker.getState()); // CLOSED
}

export const circuitBreakerExamples = {
  exampleHttpIntegration,
  exampleStateCycle,
};

void CircuitState;
