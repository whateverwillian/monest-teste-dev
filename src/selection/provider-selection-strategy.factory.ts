import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderSelectionStrategy } from './provider-selection.strategy';
import { RandomStrategy } from './random.strategy';
import { RoundRobinStrategy } from './round-robin.strategy';

/**
 * Resolve qual estratégia de seleção usar com base na configuração.
 * Responsabilidade única: escolha da strategy (round_robin vs random).
 */
@Injectable()
export class ProviderSelectionStrategyFactory {
  private readonly strategy: ProviderSelectionStrategy;

  constructor(
    configService: ConfigService,
    roundRobin: RoundRobinStrategy,
    random: RandomStrategy,
  ) {
    const selection = configService.get<string>(
      'providerSelection',
      'round_robin',
    );

    this.strategy =
      selection.toLowerCase() === 'random' ? random : roundRobin;
  }

  getStrategy(): ProviderSelectionStrategy {
    return this.strategy;
  }
}
