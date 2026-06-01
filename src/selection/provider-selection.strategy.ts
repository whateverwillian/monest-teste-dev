import { CepProvider } from '../providers/cep-provider.interface';

export interface ProviderSelectionStrategy {
  orderProviders(providers: CepProvider[]): CepProvider[];
}
