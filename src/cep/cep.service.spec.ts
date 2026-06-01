import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerOpenError } from '../common/circuit-breaker';
import { AllProvidersFailedException } from '../common/exceptions/all-providers-failed.exception';
import { CepNotFoundException } from '../common/exceptions/cep-not-found.exception';
import { CepAddress, CepProvider } from '../providers/cep-provider.interface';
import {
  CepNotFoundError,
  ProviderTimeoutError,
} from '../providers/errors/provider.errors';
import { CepProviderResolver } from './cep-provider.resolver';
import { CepService } from './cep.service';

const mockAddress: CepAddress = {
  cep: '01310100',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  provider: 'viacep',
};

function mockProvider(
  name: string,
  behavior: (cep: string) => Promise<CepAddress>,
): CepProvider {
  return { name, fetchByCep: jest.fn(behavior) };
}

function createResolverWith(
  providers: CepProvider[],
): { resolveOrderedProviders: () => CepProvider[] } {
  return { resolveOrderedProviders: () => providers };
}

describe('CepService', () => {
  let service: CepService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CepProviderResolver,
          useValue: createResolverWith([]),
        },
      ],
    }).compile();

    service = module.get(CepService);
  });

  it('rejeita CEP com formato inválido', async () => {
    await expect(service.findByCep('abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('retorna endereço do primeiro provider com sucesso', async () => {
    const providerA = mockProvider('a', async () => mockAddress);
    const providerB = mockProvider('b', async () => {
      throw new Error('should not be called');
    });

    const module = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CepProviderResolver,
          useValue: createResolverWith([providerA, providerB]),
        },
      ],
    }).compile();

    const cepService = module.get(CepService);
    const result = await cepService.findByCep('01310-100');

    expect(result).toEqual(mockAddress);
    expect(providerA.fetchByCep).toHaveBeenCalledWith('01310100');
    expect(providerB.fetchByCep).not.toHaveBeenCalled();
  });

  it('faz failover quando o primeiro provider está com circuito OPEN', async () => {
    const providerA = mockProvider('a', async () => {
      throw new CircuitBreakerOpenError('a');
    });
    const providerB = mockProvider('b', async () => ({
      ...mockAddress,
      provider: 'b',
    }));

    const module = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CepProviderResolver,
          useValue: createResolverWith([providerA, providerB]),
        },
      ],
    }).compile();

    const cepService = module.get(CepService);
    const result = await cepService.findByCep('01310100');

    expect(result.provider).toBe('b');
    expect(providerA.fetchByCep).toHaveBeenCalled();
    expect(providerB.fetchByCep).toHaveBeenCalled();
  });

  it('faz failover quando o primeiro provider dá timeout', async () => {
    const providerA = mockProvider('a', async () => {
      throw new ProviderTimeoutError('a', '01310100');
    });
    const providerB = mockProvider('b', async () => ({
      ...mockAddress,
      provider: 'b',
    }));

    const module = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CepProviderResolver,
          useValue: createResolverWith([providerA, providerB]),
        },
      ],
    }).compile();

    const cepService = module.get(CepService);
    const result = await cepService.findByCep('01310100');

    expect(result.provider).toBe('b');
    expect(providerA.fetchByCep).toHaveBeenCalled();
    expect(providerB.fetchByCep).toHaveBeenCalled();
  });

  it('lança 404 quando todos os providers retornam not found', async () => {
    const providerA = mockProvider('a', async () => {
      throw new CepNotFoundError('a', '00000000');
    });
    const providerB = mockProvider('b', async () => {
      throw new CepNotFoundError('b', '00000000');
    });

    const module = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CepProviderResolver,
          useValue: createResolverWith([providerA, providerB]),
        },
      ],
    }).compile();

    const cepService = module.get(CepService);

    await expect(cepService.findByCep('00000000')).rejects.toThrow(
      CepNotFoundException,
    );
  });

  it('lança 503 quando todos os providers falham com erro transitório', async () => {
    const providerA = mockProvider('a', async () => {
      throw new ProviderTimeoutError('a', '01310100');
    });
    const providerB = mockProvider('b', async () => {
      throw new ProviderTimeoutError('b', '01310100');
    });

    const module = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CepProviderResolver,
          useValue: createResolverWith([providerA, providerB]),
        },
      ],
    }).compile();

    const cepService = module.get(CepService);

    await expect(cepService.findByCep('01310100')).rejects.toThrow(
      AllProvidersFailedException,
    );
  });
});
