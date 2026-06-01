import { Logger } from '@nestjs/common';
import { getErrorKind } from '../observability/log-sanitizer';
import { CircuitBreakerOpenError } from './circuit-breaker-open.error';
import { CircuitBreakerOptions } from './circuit-breaker-options.interface';
import { ICircuitBreaker } from './circuit-breaker.interface';
import { CircuitState } from './circuit-breaker-state.enum';
import { IFailureClassifier } from './failure-classifier.interface';
import { OperationTimeoutError } from './operation-timeout.error';

/**
 * Implementação genérica da máquina de estados CLOSED → OPEN → HALF_OPEN.
 * Desacoplada de domínio (CEP, pagamentos, etc.) via IFailureClassifier.
 *
 * Concorrência: adequado para Node single-thread; múltiplos workers exigiriam
 * estado compartilhado externo (Redis) para o mesmo circuit name.
 */
export class CircuitBreaker implements ICircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private halfOpenInFlight = 0;

  constructor(
    private readonly options: CircuitBreakerOptions,
    private readonly failureClassifier: IFailureClassifier,
  ) {
    if (options.failureThreshold < 1) {
      throw new Error('failureThreshold must be >= 1');
    }
    if (options.halfOpenMaxCalls < 1) {
      throw new Error('halfOpenMaxCalls must be >= 1');
    }
  }

  getName(): string {
    return this.options.name;
  }

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.rejectIfOpen();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenInFlight >= this.options.halfOpenMaxCalls) {
        this.logger.warn({
          circuit: this.options.name,
          event: 'call_rejected',
          state: CircuitState.HALF_OPEN,
          reason: 'max_probe_calls',
        });
        throw new CircuitBreakerOpenError(this.options.name);
      }
      this.halfOpenInFlight++;
    }

    try {
      const result = await this.runWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.releaseHalfOpenSlot();
    }
  }

  /**
   * Em OPEN: rejeita ou transita para HALF_OPEN quando openDurationMs expirou.
   */
  private rejectIfOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      return;
    }

    if (this.shouldTransitionToHalfOpen()) {
      this.transitionTo(CircuitState.HALF_OPEN);
      return;
    }

    this.logger.warn({
      circuit: this.options.name,
      event: 'call_rejected',
      state: CircuitState.OPEN,
    });
    throw new CircuitBreakerOpenError(this.options.name);
  }

  private async runWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    const { operationTimeoutMs, name } = this.options;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new OperationTimeoutError(name, operationTimeoutMs)),
        operationTimeoutMs,
      );
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Sucesso ou resposta “negócio” (ex.: 404) em HALF_OPEN provam que a integração
   * está viva — o circuito deve fechar. Em CLOSED, sucesso zera falhas consecutivas.
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log({
        circuit: this.options.name,
        event: 'circuit_closed',
        from: CircuitState.HALF_OPEN,
      });
    }

    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenInFlight = 0;
    this.state = CircuitState.CLOSED;
  }

  private handleError(error: unknown): void {
    const isFailure = this.failureClassifier.isFailure(error);

    if (this.state === CircuitState.HALF_OPEN && !isFailure) {
      this.logger.log({
        circuit: this.options.name,
        event: 'probe_recovered',
        errorKind: getErrorKind(error),
        note: 'integration_responding',
      });
      this.onSuccess();
      return;
    }

    if (!isFailure) {
      return;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn({
        circuit: this.options.name,
        event: 'probe_failed',
        errorKind: getErrorKind(error),
      });
      this.openCircuit(CircuitState.HALF_OPEN);
      return;
    }

    this.consecutiveFailures++;

    this.logger.warn({
      circuit: this.options.name,
      event: 'failure_recorded',
      state: CircuitState.CLOSED,
      consecutiveFailures: this.consecutiveFailures,
      failureThreshold: this.options.failureThreshold,
      errorKind: getErrorKind(error),
    });

    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.openCircuit(CircuitState.CLOSED);
    }
  }

  private openCircuit(from: CircuitState): void {
    this.state = CircuitState.OPEN;
    this.openedAt = Date.now();
    this.consecutiveFailures = 0;
    this.halfOpenInFlight = 0;

    this.logger.warn({
      circuit: this.options.name,
      event: 'circuit_opened',
      from,
      openDurationMs: this.options.openDurationMs,
    });
  }

  private shouldTransitionToHalfOpen(): boolean {
    if (this.openedAt === null) {
      return true;
    }
    return Date.now() - this.openedAt >= this.options.openDurationMs;
  }

  private transitionTo(next: CircuitState): void {
    this.state = next;

    if (next === CircuitState.HALF_OPEN) {
      this.halfOpenInFlight = 0;
      this.logger.log({
        circuit: this.options.name,
        event: 'circuit_half_open',
        halfOpenMaxCalls: this.options.halfOpenMaxCalls,
      });
    }
  }

  private releaseHalfOpenSlot(): void {
    if (this.state === CircuitState.HALF_OPEN && this.halfOpenInFlight > 0) {
      this.halfOpenInFlight--;
    }
  }
}
