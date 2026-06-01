import { Injectable } from '@nestjs/common';
import { CepProvider } from '../providers/cep-provider.interface';
import { ProviderSelectionStrategy } from './provider-selection.strategy';

@Injectable()
export class RandomStrategy implements ProviderSelectionStrategy {
  orderProviders(providers: CepProvider[]): CepProvider[] {
    const copy = [...providers];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }
}
