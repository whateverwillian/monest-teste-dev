import { ICircuitBreaker } from '../common/circuit-breaker';
import { CepAddress, CepProvider } from './cep-provider.interface';

/**
 * Decorator no nível provider: compõe integração HTTP + circuit breaker.
 * Responsabilidade única: delegar fetchByCep protegido pelo breaker.
 */
export class CepCircuitBreakerProvider implements CepProvider {
  readonly name: string;

  constructor(
    private readonly delegate: CepProvider,
    private readonly circuitBreaker: ICircuitBreaker,
  ) {
    this.name = delegate.name;
  }

  fetchByCep(cep: string): Promise<CepAddress> {
    return this.circuitBreaker.execute(() => this.delegate.fetchByCep(cep));
  }
}
