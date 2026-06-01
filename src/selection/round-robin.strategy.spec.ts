import { CepProvider } from '../providers/cep-provider.interface';
import { RoundRobinStrategy } from './round-robin.strategy';

function mockProvider(name: string): CepProvider {
  return { name, fetchByCep: jest.fn() };
}

describe('RoundRobinStrategy', () => {
  it('rotaciona qual provider vem primeiro', () => {
    const strategy = new RoundRobinStrategy();
    const providers = [mockProvider('a'), mockProvider('b')];

    const first = strategy.orderProviders(providers).map((p) => p.name);
    const second = strategy.orderProviders(providers).map((p) => p.name);
    const third = strategy.orderProviders(providers).map((p) => p.name);

    expect(first).toEqual(['a', 'b']);
    expect(second).toEqual(['b', 'a']);
    expect(third).toEqual(['a', 'b']);
  });

  it('retorna lista vazia quando não há providers', () => {
    const strategy = new RoundRobinStrategy();
    expect(strategy.orderProviders([])).toEqual([]);
  });
});
