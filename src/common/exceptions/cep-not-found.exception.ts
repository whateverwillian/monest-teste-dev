import { NotFoundException } from '@nestjs/common';

export class CepNotFoundException extends NotFoundException {
  constructor() {
    super('CEP não encontrado');
  }
}
