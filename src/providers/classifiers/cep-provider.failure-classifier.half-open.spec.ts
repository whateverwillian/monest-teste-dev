import { CircuitBreaker, CircuitState } from '../../common/circuit-breaker';
import {
  CepNotFoundError,
  ProviderUnavailableError,
} from '../errors/provider.errors';
import { CepProviderFailureClassifier } from './cep-provider.failure-classifier';

describe('CircuitBreaker + CepProviderFailureClassifier (HALF_OPEN)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fecha o circuito em HALF_OPEN quando CepNotFoundError indica API viva', async () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker(
      {
        name: 'viacep',
        failureThreshold: 1,
        openDurationMs: 10_000,
        halfOpenMaxCalls: 1,
        operationTimeoutMs: 5_000,
      },
      new CepProviderFailureClassifier(),
    );

    await expect(
      breaker.execute(() =>
        Promise.reject(new ProviderUnavailableError('viacep', '01310100')),
      ),
    ).rejects.toThrow();

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(10_000);

    await expect(
      breaker.execute(() =>
        Promise.reject(new CepNotFoundError('viacep', '00000000')),
      ),
    ).rejects.toThrow(CepNotFoundError);

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });
});
