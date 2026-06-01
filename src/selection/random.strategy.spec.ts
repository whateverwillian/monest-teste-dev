import { CepProvider } from '../providers/cep-provider.interface';
import { RandomStrategy } from './random.strategy';

function mockProvider(name: string): CepProvider {
  return { name, fetchByCep: jest.fn() };
}

describe('RandomStrategy', () => {
  it('retorna todos os providers em ordem permutada', () => {
    const strategy = new RandomStrategy();
    const providers = [
      mockProvider('a'),
      mockProvider('b'),
      mockProvider('c'),
    ];

    const ordered = strategy.orderProviders(providers).map((p) => p.name);

    expect(ordered.sort()).toEqual(['a', 'b', 'c']);
  });
});
