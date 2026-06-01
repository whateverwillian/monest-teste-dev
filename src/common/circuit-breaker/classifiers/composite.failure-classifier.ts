import { IFailureClassifier } from '../failure-classifier.interface';

/** Combina vários classifiers; falha se qualquer um considerar falha. */
export class CompositeFailureClassifier implements IFailureClassifier {
  constructor(private readonly classifiers: IFailureClassifier[]) {}

  isFailure(error: unknown): boolean {
    return this.classifiers.some((c) => c.isFailure(error));
  }
}
