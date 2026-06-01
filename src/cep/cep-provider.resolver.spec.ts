import { Test, TestingModule } from '@nestjs/testing';
import { CepProvider } from '../providers/cep-provider.interface';
import { CepProviderRegistry } from '../providers/cep-provider.registry';
import { ProviderSelectionStrategy } from '../selection/provider-selection.strategy';
import { ProviderSelectionStrategyFactory } from '../selection/provider-selection-strategy.factory';
import { CepProviderResolver } from './cep-provider.resolver';

function mockProvider(name: string): CepProvider {
  return { name, fetchByCep: jest.fn() };
}

describe('CepProviderResolver', () => {
  it('combina registry com strategy para retornar providers ordenados', () => {
    const providerA = mockProvider('a');
    const providerB = mockProvider('b');

    const registry = { getAll: () => [providerA, providerB] };
    const strategy: ProviderSelectionStrategy = {
      orderProviders: (providers) => [...providers].reverse(),
    };
    const strategyFactory = { getStrategy: () => strategy };

    const resolver = new CepProviderResolver(
      registry as unknown as CepProviderRegistry,
      strategyFactory as unknown as ProviderSelectionStrategyFactory,
    );

    const ordered = resolver.resolveOrderedProviders();

    expect(ordered.map((p) => p.name)).toEqual(['b', 'a']);
  });

  it('integra com providers do módulo via DI', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepProviderResolver,
        {
          provide: CepProviderRegistry,
          useValue: { getAll: () => [mockProvider('a')] },
        },
        {
          provide: ProviderSelectionStrategyFactory,
          useValue: {
            getStrategy: () => ({
              orderProviders: (p: CepProvider[]) => p,
            }),
          },
        },
      ],
    }).compile();

    const resolver = module.get(CepProviderResolver);

    expect(resolver.resolveOrderedProviders()).toHaveLength(1);
  });
});
