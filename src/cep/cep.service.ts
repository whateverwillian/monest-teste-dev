import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { maskCep } from '../common/observability/log-sanitizer';
import { getProviderErrorKind } from '../common/observability/provider-error-kind';
import { CircuitBreakerOpenError } from '../common/circuit-breaker';
import { AllProvidersFailedException } from '../common/exceptions/all-providers-failed.exception';
import { CepNotFoundException } from '../common/exceptions/cep-not-found.exception';
import {
  CepNotFoundError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../providers/errors/provider.errors';
import { CepProviderResolver } from './cep-provider.resolver';
import { CepResponseDto } from './dto/cep-response.dto';
import { validateAndNormalizeCep } from './validators/cep.validator';

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);

  constructor(private readonly providerResolver: CepProviderResolver) {}

  async findByCep(rawCep: string): Promise<CepResponseDto> {
    let cep: string;

    try {
      cep = validateAndNormalizeCep(rawCep);
    } catch {
      this.logger.warn({ outcome: 'invalid_cep_format' });
      throw new BadRequestException(
        'CEP inválido. Informe 8 dígitos (com ou sem hífen).',
      );
    }

    const orderedProviders = this.providerResolver.resolveOrderedProviders();
    const providerOrder = orderedProviders.map((p) => p.name);
    const cepMasked = maskCep(cep);

    this.logger.log({
      cep: cepMasked,
      outcome: 'lookup_started',
      providerOrder,
    });

    let lastNotFound: CepNotFoundError | null = null;
    const failures: string[] = [];

    for (const [index, provider] of orderedProviders.entries()) {
      const isLast = index === orderedProviders.length - 1;
      const attempt = index + 1;

      try {
        const result = await provider.fetchByCep(cep);

        if (index > 0) {
          this.logger.warn({
            cep: cepMasked,
            outcome: 'failover_success',
            provider: provider.name,
            winningProvider: result.provider,
            attempt,
          });
        } else {
          this.logger.log({
            cep: cepMasked,
            outcome: 'lookup_success',
            provider: result.provider,
            attempt,
          });
        }

        return result;
      } catch (error) {
        if (error instanceof CepNotFoundError) {
          lastNotFound = error;
          this.logger.warn({
            cep: cepMasked,
            provider: provider.name,
            outcome: 'not_found',
            attempt,
            willFailover: !isLast,
          });

          if (!isLast) {
            continue;
          }

          this.logger.warn({
            cep: cepMasked,
            outcome: 'not_found_all_providers',
          });
          throw new CepNotFoundException();
        }

        const reason = this.classifyFailoverReason(error);
        failures.push(`${provider.name}:${reason}`);

        this.logger.warn({
          cep: cepMasked,
          provider: provider.name,
          outcome: 'provider_failed',
          reason,
          errorKind: getProviderErrorKind(error),
          attempt,
          willFailover: !isLast,
        });
      }
    }

    if (lastNotFound) {
      this.logger.warn({
        cep: cepMasked,
        outcome: 'not_found_all_providers',
      });
      throw new CepNotFoundException();
    }

    this.logger.error({
      cep: cepMasked,
      outcome: 'all_providers_failed',
      failures,
      providerOrder,
    });

    throw new AllProvidersFailedException();
  }

  private classifyFailoverReason(error: unknown): string {
    if (error instanceof CircuitBreakerOpenError) {
      return 'circuit_open';
    }
    if (error instanceof ProviderTimeoutError) {
      return 'timeout';
    }
    if (error instanceof ProviderUnavailableError) {
      return 'unavailable';
    }
    return 'unknown';
  }
}
