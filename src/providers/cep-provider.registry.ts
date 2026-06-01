import { Injectable } from '@nestjs/common';
import { BrasilApiProvider } from './brasilapi/brasilapi.provider';
import { CepProvider } from './cep-provider.interface';
import { CepProviderCircuitBreakerFactory } from './cep-provider-circuit-breaker.factory';
import { ViaCepProvider } from './viacep/viacep.provider';

/**
 * Catálogo de CepProviders expostos à aplicação (já com circuit breaker).
 * Responsabilidade única: definir quais integrações existem e expô-las com resiliência.
 */
@Injectable()
export class CepProviderRegistry {
  private readonly providers: readonly CepProvider[];

  constructor(
    factory: CepProviderCircuitBreakerFactory,
    viaCep: ViaCepProvider,
    brasilApi: BrasilApiProvider,
  ) {
    this.providers = factory.createResilientProviders([viaCep, brasilApi]);
  }

  getAll(): readonly CepProvider[] {
    return this.providers;
  }
}
