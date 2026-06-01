import { ServiceUnavailableException } from '@nestjs/common';

export class AllProvidersFailedException extends ServiceUnavailableException {
  constructor() {
    super(
      'Não foi possível consultar o CEP no momento. Tente novamente mais tarde.',
    );
  }
}
