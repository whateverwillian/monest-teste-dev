import { Injectable } from '@nestjs/common';
import { CepProvider } from '../providers/cep-provider.interface';
import { ProviderSelectionStrategy } from './provider-selection.strategy';

@Injectable()
export class RoundRobinStrategy implements ProviderSelectionStrategy {
  private index = 0;

  orderProviders(providers: CepProvider[]): CepProvider[] {
    if (providers.length === 0) {
      return [];
    }

    const start = this.index % providers.length;
    this.index = (this.index + 1) % providers.length;

    return [
      ...providers.slice(start),
      ...providers.slice(0, start),
    ];
  }
}
