import { Module } from '@nestjs/common';

/**
 * Módulo de exportação do circuit breaker genérico.
 * A composição com integrações específicas fica nos módulos de domínio (ex.: CepModule).
 */
@Module({})
export class CircuitBreakerModule {}
