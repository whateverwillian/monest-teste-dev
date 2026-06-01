import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreaker,
  CircuitBreakerOptions,
  ICircuitBreaker,
} from '../common/circuit-breaker';
import { CepProvider } from './cep-provider.interface';
import { CepCircuitBreakerProvider } from './cep-circuit-breaker.provider';
import { CepProviderFailureClassifier } from './classifiers/cep-provider.failure-classifier';

@Injectable()
export class CepProviderCircuitBreakerFactory {
  constructor(private readonly configService: ConfigService) {}

  wrapProvider(delegate: CepProvider): CepCircuitBreakerProvider {
    return new CepCircuitBreakerProvider(
      delegate,
      this.createCircuitBreaker(delegate.name),
    );
  }

  createResilientProviders(delegates: readonly CepProvider[]): CepProvider[] {
    return delegates.map((delegate) => this.wrapProvider(delegate));
  }

  private createCircuitBreaker(name: string): ICircuitBreaker {
    const options: CircuitBreakerOptions = {
      name,
      failureThreshold: this.configService.get<number>(
        'circuitBreaker.failureThreshold',
        2,
      ),
      openDurationMs: this.configService.get<number>(
        'circuitBreaker.openDurationMs',
        30_000,
      ),
      halfOpenMaxCalls: this.configService.get<number>(
        'circuitBreaker.halfOpenMaxCalls',
        1,
      ),
      operationTimeoutMs: this.configService.get<number>(
        'circuitBreaker.operationTimeoutMs',
        5_000,
      ),
    };

    return new CircuitBreaker(options, new CepProviderFailureClassifier());
  }
}
