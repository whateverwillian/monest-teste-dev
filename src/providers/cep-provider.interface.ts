export interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  provider: string;
}

export interface CepProvider {
  readonly name: string;
  fetchByCep(cep: string): Promise<CepAddress>;
}
