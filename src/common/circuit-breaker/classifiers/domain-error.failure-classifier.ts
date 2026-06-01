import { IFailureClassifier } from '../failure-classifier.interface';

/**
 * Classifier genérico baseado em predicado (OCP).
 * Útil quando a integração já mapeia erros de domínio antes do breaker.
 */
export class DomainErrorFailureClassifier implements IFailureClassifier {
  constructor(
    private readonly isDomainFailure: (error: unknown) => boolean,
    private readonly fallback?: IFailureClassifier,
  ) {}

  isFailure(error: unknown): boolean {
    if (this.isDomainFailure(error)) {
      return true;
    }

    if (this.fallback) {
      return this.fallback.isFailure(error);
    }

    return false;
  }
}
