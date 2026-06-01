import { AxiosError, AxiosHeaders } from 'axios';
import { CircuitBreaker } from './circuit-breaker';
import { CircuitBreakerOpenError } from './circuit-breaker-open.error';
import { CircuitState } from './circuit-breaker-state.enum';
import { HttpStatusFailureClassifier } from './classifiers/http-status.failure-classifier';
import { OperationTimeoutError } from './operation-timeout.error';
import { IFailureClassifier } from './failure-classifier.interface';

const defaultOptions = {
  name: 'test-circuit',
  failureThreshold: 3,
  openDurationMs: 30_000,
  halfOpenMaxCalls: 1,
  operationTimeoutMs: 5_000,
};

function createBreaker(classifier?: IFailureClassifier): CircuitBreaker {
  return new CircuitBreaker(
    defaultOptions,
    classifier ?? new HttpStatusFailureClassifier(),
  );
}

describe('CircuitBreaker', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('executa operação em CLOSED e mantém estado', async () => {
    const breaker = createBreaker();
    const result = await breaker.execute(async () => 'ok');

    expect(result).toBe('ok');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('abre após falhas consecutivas classificadas', async () => {
    const breaker = createBreaker();
    const fail = () => Promise.reject(new Error('boom'));

    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    await expect(breaker.execute(fail)).rejects.toThrow('boom');

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('rejeita imediatamente em OPEN sem chamar operação', async () => {
    const breaker = createBreaker();
    const operation = jest.fn().mockResolvedValue('ok');
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow();
    }

    await expect(breaker.execute(operation)).rejects.toThrow(
      CircuitBreakerOpenError,
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it('transita para HALF_OPEN após openDurationMs', async () => {
    jest.useFakeTimers();
    const breaker = createBreaker();
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow();
    }

    jest.advanceTimersByTime(30_000);

    const operation = jest.fn().mockResolvedValue('recovered');
    const result = await breaker.execute(operation);

    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('reabre em HALF_OPEN se probe falhar', async () => {
    jest.useFakeTimers();
    const breaker = createBreaker();
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow();
    }

    jest.advanceTimersByTime(30_000);

    await expect(breaker.execute(fail)).rejects.toThrow('fail');
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('não conta 404 Axios como falha', async () => {
    const breaker = createBreaker();
    const notFound = new AxiosError('Not Found');
    notFound.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    };

    await expect(
      breaker.execute(() => Promise.reject(notFound)),
    ).rejects.toThrow();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker['consecutiveFailures']).toBe(0);
  });

  it('conta 500 Axios como falha', async () => {
    const breaker = createBreaker();
    const serverError = new AxiosError('Server Error');
    serverError.response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    };

    await expect(
      breaker.execute(() => Promise.reject(serverError)),
    ).rejects.toThrow();

    expect(breaker['consecutiveFailures']).toBe(1);
  });

  it('em HALF_OPEN, erro não classificado como falha fecha o circuito (serviço respondeu)', async () => {
    jest.useFakeTimers();
    const breaker = createBreaker();
    const fail = () => Promise.reject(new Error('fail'));
    const businessError = new AxiosError('Not Found');
    businessError.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow();
    }

    jest.advanceTimersByTime(30_000);

    await expect(
      breaker.execute(() => Promise.reject(businessError)),
    ).rejects.toThrow();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('sucesso em CLOSED zera contador de falhas consecutivas', async () => {
    const breaker = createBreaker();
    const fail = () => Promise.reject(new Error('fail'));

    await expect(breaker.execute(fail)).rejects.toThrow();
    await expect(breaker.execute(fail)).rejects.toThrow();
    expect(breaker['consecutiveFailures']).toBe(2);

    await breaker.execute(async () => 'ok');

    expect(breaker['consecutiveFailures']).toBe(0);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('rejeita chamadas excedentes em HALF_OPEN quando halfOpenMaxCalls é atingido', async () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker(
      { ...defaultOptions, halfOpenMaxCalls: 1 },
      new HttpStatusFailureClassifier(),
    );
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow();
    }

    jest.advanceTimersByTime(30_000);

    const slowProbe = () =>
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('ok'), 1_000);
      });

    const first = breaker.execute(slowProbe);
    await expect(breaker.execute(async () => 'blocked')).rejects.toThrow(
      CircuitBreakerOpenError,
    );

    jest.advanceTimersByTime(1_000);
    await expect(first).resolves.toBe('ok');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('conta OperationTimeoutError como falha', async () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker(
      { ...defaultOptions, operationTimeoutMs: 100 },
      new HttpStatusFailureClassifier(),
    );

    const slow = () =>
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('late'), 500);
      });

    const promise = breaker.execute(slow);
    jest.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow(OperationTimeoutError);
    expect(breaker['consecutiveFailures']).toBe(1);
  });
});
