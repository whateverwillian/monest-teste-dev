import { AxiosError } from 'axios';
import { OperationTimeoutError } from '../operation-timeout.error';
import { IFailureClassifier } from '../failure-classifier.interface';

const NON_FAILURE_HTTP_STATUS = new Set([400, 404, 422]);

/**
 * Classifier genérico para integrações HTTP (Axios).
 * Falhas: timeout, rede, 5xx. Não falha: 400, 404, 422.
 */
export class HttpStatusFailureClassifier implements IFailureClassifier {
  isFailure(error: unknown): boolean {
    if (error instanceof OperationTimeoutError) {
      return true;
    }

    if (error instanceof AxiosError) {
      if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ERR_NETWORK'
      ) {
        return true;
      }

      const status = error.response?.status;
      if (status === undefined) {
        return true;
      }

      if (NON_FAILURE_HTTP_STATUS.has(status)) {
        return false;
      }

      return status >= 500;
    }

    return true;
  }
}
