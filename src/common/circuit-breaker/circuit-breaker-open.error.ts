export class CircuitBreakerOpenError extends Error {
  constructor(public readonly circuitName: string) {
    super(`Circuit breaker "${circuitName}" is OPEN`);
    this.name = 'CircuitBreakerOpenError';
  }
}
