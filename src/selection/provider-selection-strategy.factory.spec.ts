import { ConfigService } from '@nestjs/config';
import { ProviderSelectionStrategyFactory } from './provider-selection-strategy.factory';
import { RandomStrategy } from './random.strategy';
import { RoundRobinStrategy } from './round-robin.strategy';

describe('ProviderSelectionStrategyFactory', () => {
  const roundRobin = new RoundRobinStrategy();
  const random = new RandomStrategy();

  it('usa RoundRobinStrategy por padrão', () => {
    const config = { get: () => 'round_robin' } as unknown as ConfigService;
    const factory = new ProviderSelectionStrategyFactory(
      config,
      roundRobin,
      random,
    );

    expect(factory.getStrategy()).toBe(roundRobin);
  });

  it('usa RandomStrategy quando configurado', () => {
    const config = { get: () => 'random' } as unknown as ConfigService;
    const factory = new ProviderSelectionStrategyFactory(
      config,
      roundRobin,
      random,
    );

    expect(factory.getStrategy()).toBe(random);
  });
});
