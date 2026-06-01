import { maskCep, sanitizeRequestUrl } from './log-sanitizer';

describe('log-sanitizer', () => {
  it('mascara CEP de 8 dígitos', () => {
    expect(maskCep('01310100')).toBe('013*****');
  });

  it('sanitiza CEP na URL da requisição', () => {
    expect(sanitizeRequestUrl('/cep/01310100')).toBe('/cep/******');
    expect(sanitizeRequestUrl('/cep/01310-100?x=1')).toBe('/cep/******?x=1');
  });
});
