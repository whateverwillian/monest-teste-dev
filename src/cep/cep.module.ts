import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerModule } from '../common/circuit-breaker/circuit-breaker.module';
import { BrasilApiProvider } from '../providers/brasilapi/brasilapi.provider';
import { CepProviderCircuitBreakerFactory } from '../providers/cep-provider-circuit-breaker.factory';
import { CepProviderRegistry } from '../providers/cep-provider.registry';
import { ViaCepProvider } from '../providers/viacep/viacep.provider';
import { ProviderSelectionStrategyFactory } from '../selection/provider-selection-strategy.factory';
import { RandomStrategy } from '../selection/random.strategy';
import { RoundRobinStrategy } from '../selection/round-robin.strategy';
import { CepProviderResolver } from './cep-provider.resolver';
import { CepController } from './cep.controller';
import { CepService } from './cep.service';

@Module({
  imports: [HttpModule, ConfigModule, CircuitBreakerModule],
  controllers: [CepController],
  providers: [
    RoundRobinStrategy,
    RandomStrategy,
    ProviderSelectionStrategyFactory,
    CepProviderCircuitBreakerFactory,
    ViaCepProvider,
    BrasilApiProvider,
    CepProviderRegistry,
    CepProviderResolver,
    CepService,
  ],
})
export class CepModule {}
