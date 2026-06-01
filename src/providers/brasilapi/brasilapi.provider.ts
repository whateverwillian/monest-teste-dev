import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CepAddress, CepProvider } from '../cep-provider.interface';
import {
  CepNotFoundError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../errors/provider.errors';
import { maskCep } from '../../common/observability/log-sanitizer';
import { getProviderErrorKind } from '../../common/observability/provider-error-kind';
import { BrasilApiCepResponse } from './brasilapi.types';

const BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api/cep/v1';

@Injectable()
export class BrasilApiProvider implements CepProvider {
  readonly name = 'brasilapi';
  private readonly logger = new Logger(BrasilApiProvider.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.timeoutMs = configService.get<number>('httpTimeoutMs', 5000);
  }

  async fetchByCep(cep: string): Promise<CepAddress> {
    const start = Date.now();
    const url = `${BRASIL_API_BASE_URL}/${cep}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<BrasilApiCepResponse>(url, {
          timeout: this.timeoutMs,
        }),
      );

      const durationMs = Date.now() - start;
      this.logger.log({
        provider: this.name,
        cep: maskCep(cep),
        durationMs,
        outcome: 'integration_success',
      });

      return {
        cep: data.cep.replace(/\D/g, ''),
        street: data.street ?? '',
        neighborhood: data.neighborhood ?? '',
        city: data.city,
        state: data.state,
        provider: this.name,
      };
    } catch (error) {
      const durationMs = Date.now() - start;
      this.logger.warn({
        provider: this.name,
        cep: maskCep(cep),
        durationMs,
        outcome: 'integration_error',
        errorKind: getProviderErrorKind(error),
      });

      throw this.mapError(error, cep);
    }
  }

  private mapError(error: unknown, cep: string): Error {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new ProviderTimeoutError(this.name, cep);
      }
      if (error.response?.status === 404) {
        return new CepNotFoundError(this.name, cep);
      }
    }

    return new ProviderUnavailableError(this.name, cep, error);
  }
}
