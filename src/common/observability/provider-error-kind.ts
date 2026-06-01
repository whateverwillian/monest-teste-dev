import {
  CepNotFoundError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../../providers/errors/provider.errors';
import { getErrorKind } from './log-sanitizer';

/** Classificação de erro para logs de provider CEP (sem expor detalhes HTTP). */
export function getProviderErrorKind(error: unknown): string {
  if (error instanceof CepNotFoundError) {
    return 'cep_not_found';
  }
  if (error instanceof ProviderTimeoutError) {
    return 'provider_timeout';
  }
  if (error instanceof ProviderUnavailableError) {
    return 'provider_unavailable';
  }
  return getErrorKind(error);
}
