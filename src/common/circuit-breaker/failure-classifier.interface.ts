/**
 * Define o que conta como falha para o circuit breaker (DIP).
 * Integrações injetam classifiers específicos sem alterar o core.
 */
export interface IFailureClassifier {
  isFailure(error: unknown): boolean;
}
