import { AxiosError, AxiosHeaders } from 'axios';
import {
  CepNotFoundError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../errors/provider.errors';
import { CepProviderFailureClassifier } from './cep-provider.failure-classifier';

describe('CepProviderFailureClassifier', () => {
  const classifier = new CepProviderFailureClassifier();

  it('não considera CepNotFoundError como falha', () => {
    expect(
      classifier.isFailure(new CepNotFoundError('viacep', '00000000')),
    ).toBe(false);
  });

  it('considera timeout e indisponibilidade como falha', () => {
    expect(
      classifier.isFailure(new ProviderTimeoutError('viacep', '01310100')),
    ).toBe(true);
    expect(
      classifier.isFailure(
        new ProviderUnavailableError('viacep', '01310100'),
      ),
    ).toBe(true);
  });

  it('não considera HTTP 404 como falha', () => {
    const error = new AxiosError('Not Found');
    error.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    };

    expect(classifier.isFailure(error)).toBe(false);
  });

  it('considera HTTP 500 como falha', () => {
    const error = new AxiosError('Server Error');
    error.response = {
      status: 500,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    };

    expect(classifier.isFailure(error)).toBe(true);
  });
});
