export class CepNotFoundError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly cep: string,
  ) {
    super(`CEP ${cep} not found via ${providerName}`);
    this.name = 'CepNotFoundError';
  }
}

export class ProviderTimeoutError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly cep: string,
  ) {
    super(`Timeout fetching CEP ${cep} via ${providerName}`);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly cep: string,
    public readonly cause?: unknown,
  ) {
    super(`Provider ${providerName} unavailable for CEP ${cep}`);
    this.name = 'ProviderUnavailableError';
  }
}
