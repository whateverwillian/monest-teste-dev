import {
  HttpStatusFailureClassifier,
  IFailureClassifier,
} from '../../common/circuit-breaker';
import {
  CepNotFoundError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../errors/provider.errors';

/**
 * Classifier para adapters CepProvider.
 * 404/CEP inexistente não abre o circuito; indisponibilidade e timeout sim.
 */
export class CepProviderFailureClassifier implements IFailureClassifier {
  private readonly httpClassifier = new HttpStatusFailureClassifier();

  isFailure(error: unknown): boolean {
    if (error instanceof CepNotFoundError) {
      return false;
    }

    if (
      error instanceof ProviderTimeoutError ||
      error instanceof ProviderUnavailableError
    ) {
      return true;
    }

    return this.httpClassifier.isFailure(error);
  }
}
