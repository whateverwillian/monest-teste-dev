import { Controller, Get, Param } from '@nestjs/common';
import { CepService } from './cep.service';
import { CepResponseDto } from './dto/cep-response.dto';

@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(':cep')
  findByCep(@Param('cep') cep: string): Promise<CepResponseDto> {
    return this.cepService.findByCep(cep);
  }
}
