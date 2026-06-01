import { CircuitBreaker } from '../common/circuit-breaker';
import { CepAddress, CepProvider } from './cep-provider.interface';
import { CepCircuitBreakerProvider } from './cep-circuit-breaker.provider';
import { CepProviderFailureClassifier } from './classifiers/cep-provider.failure-classifier';
import { ProviderUnavailableError } from './errors/provider.errors';

const mockAddress: CepAddress = {
  cep: '01310100',
  street: 'Rua Teste',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  provider: 'mock',
};

function createDelegate(
  behavior: (cep: string) => Promise<CepAddress>,
): CepProvider {
  return { name: 'mock', fetchByCep: jest.fn(behavior) };
}

describe('CepCircuitBreakerProvider', () => {
  it('delega fetchByCep ao provider interno quando circuito fechado', async () => {
    const delegate = createDelegate(async () => mockAddress);
    const breaker = new CircuitBreaker(
      {
        name: 'mock',
        failureThreshold: 2,
        openDurationMs: 30_000,
        halfOpenMaxCalls: 1,
        operationTimeoutMs: 5_000,
      },
      new CepProviderFailureClassifier(),
    );

    const provider = new CepCircuitBreakerProvider(delegate, breaker);
    const result = await provider.fetchByCep('01310100');

    expect(result).toEqual(mockAddress);
    expect(delegate.fetchByCep).toHaveBeenCalledWith('01310100');
  });

  it('não chama delegate quando circuito está OPEN', async () => {
    const delegate = createDelegate(async () => {
      throw new ProviderUnavailableError('mock', '01310100');
    });
    const breaker = new CircuitBreaker(
      {
        name: 'mock',
        failureThreshold: 1,
        openDurationMs: 60_000,
        halfOpenMaxCalls: 1,
        operationTimeoutMs: 5_000,
      },
      new CepProviderFailureClassifier(),
    );

    const provider = new CepCircuitBreakerProvider(delegate, breaker);

    await expect(provider.fetchByCep('01310100')).rejects.toThrow(
      ProviderUnavailableError,
    );

    await expect(provider.fetchByCep('01310100')).rejects.toThrow();
    expect(delegate.fetchByCep).toHaveBeenCalledTimes(1);
  });
});
