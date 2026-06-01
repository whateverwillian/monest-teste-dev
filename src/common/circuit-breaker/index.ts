/**
 * Circuit Breaker genérico (resiliência desacoplada de domínio)
 *
 * Decisões arquiteturais:
 *
 * 1. IFailureClassifier (DIP): o core não sabe se 404 é falha — cada integração define.
 * 2. CircuitBreaker em common/: reutilizável por CEP, pagamentos, notificações, etc.
 * 3. Decorator no adapter (ex. CepCircuitBreakerProvider): breaker à nível provider,
 *    uma instância e estado por integração externa, sem poluir CepService.
 * 4. operationTimeoutMs no execute(): timeout da operação protegida, independente do HTTP client.
 */

export { CircuitBreaker } from './circuit-breaker';
export { CircuitBreakerModule } from './circuit-breaker.module';
export { CircuitState } from './circuit-breaker-state.enum';
export type { CircuitBreakerOptions } from './circuit-breaker-options.interface';
export type { ICircuitBreaker } from './circuit-breaker.interface';
export type { IFailureClassifier } from './failure-classifier.interface';
export { CircuitBreakerOpenError } from './circuit-breaker-open.error';
export { OperationTimeoutError } from './operation-timeout.error';
export { HttpStatusFailureClassifier } from './classifiers/http-status.failure-classifier';
export { DomainErrorFailureClassifier } from './classifiers/domain-error.failure-classifier';
export { CompositeFailureClassifier } from './classifiers/composite.failure-classifier';
