import { Injectable } from '@nestjs/common';
import { CepProviderRegistry } from '../providers/cep-provider.registry';
import { CepProvider } from '../providers/cep-provider.interface';
import { ProviderSelectionStrategyFactory } from '../selection/provider-selection-strategy.factory';

/**
 * Resolve a ordem de tentativa dos providers para uma consulta de CEP.
 * Responsabilidade única: combinar catálogo (registry) com a strategy de seleção.
 */
@Injectable()
export class CepProviderResolver {
  constructor(
    private readonly providerRegistry: CepProviderRegistry,
    private readonly selectionStrategyFactory: ProviderSelectionStrategyFactory,
  ) {}

  resolveOrderedProviders(): CepProvider[] {
    const strategy = this.selectionStrategyFactory.getStrategy();
    return strategy.orderProviders([...this.providerRegistry.getAll()]);
  }
}
