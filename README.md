# Teste Técnico - Desenvolvedor

## O problema

Você precisa criar uma API que consulta CEP. Simples, certo?

Só que: você não controla as APIs externas. Elas caem, demoram, retornam erro. Seu serviço precisa continuar funcionando.

## APIs disponíveis

- ViaCEP: `https://viacep.com.br/ws/{cep}/json/`
- BrasilAPI: `https://brasilapi.com.br/api/cep/v1/{cep}`

## Requisitos

### Endpoint
`GET /cep/{cep}`

### Comportamento esperado
- Alterna entre as duas APIs (pode ser aleatório ou round-robin)
- Se uma falhar, tenta a outra automaticamente
- Retorna um contrato único, independente de qual API respondeu

### O que queremos ver

1. **Abstração** — Como você isola os providers externos? Se amanhã adicionarmos uma terceira API, o que muda no código?

2. **Resiliência** — O que acontece quando uma API demora 30 segundos? E quando as duas estão fora?

3. **Observabilidade** — Se der erro em produção, como a gente descobre o que aconteceu?

4. **Tratamento de erros** — Erros diferentes devem ter tratamentos diferentes. Timeout não é a mesma coisa que 404.

## Stack

NestJS + TypeScript. Fora isso, use o que fizer sentido.

## O que não estamos avaliando

- Frontend
- Banco de dados
- Deploy
- Cobertura de testes de 100%

## Como entregar

Fork este repositório, implemente, e envie o link para [matheus.morett@monest.com.br](mailto:matheus.morett@monest.com.br) com o assunto **Teste Dev - Monest**.

Se o repositório for privado, adicione `matheusmorett2` como colaborador.

---

## Implementação

### Como executar

```bash
cp .env.example .env
npm install
npm run start:dev
```

A API sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

### Exemplo de uso

```bash
curl http://localhost:3000/cep/01310100
```

Resposta:

```json
{
  "cep": "01310100",
  "street": "Avenida Paulista",
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "state": "SP",
  "provider": "viacep"
}
```

### Configuração

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta HTTP | `3000` |
| `PROVIDER_SELECTION` | `round_robin` ou `random` | `round_robin` |
| `HTTP_TIMEOUT_MS` | Timeout das APIs externas (ms) | `5000` |
| `THROTTLE_TTL` | Janela do rate limit (s) | `60` |
| `THROTTLE_LIMIT` | Máximo de requisições por IP na janela | `60` |
| `CB_FAILURE_THRESHOLD` | Falhas consecutivas para abrir o circuit breaker | `5` |
| `CB_OPEN_DURATION_MS` | Tempo em OPEN antes de HALF_OPEN (ms) | `30000` |
| `CB_HALF_OPEN_MAX_CALLS` | Chamadas de teste em HALF_OPEN | `1` |
| `CB_OPERATION_TIMEOUT_MS` | Timeout da operação no circuit breaker (ms) | `5000` |

### Arquitetura

- **`CepProviderResolver`**: ponto único injetado no `CepService`; resolve a ordem de tentativa dos providers.
- **`CepProviderRegistry`**: catálogo dos adapters resilientes (`CepCircuitBreakerProvider` → `ViaCep` / `BrasilAPI`).
- **`CircuitBreaker`** (`src/common/circuit-breaker`): máquina de estados genérica (CLOSED / OPEN / HALF_OPEN), reutilizável fora do domínio CEP.
- **`CepCircuitBreakerProvider`**: decorator no nível provider; uma instância de breaker por integração.
- **`ProviderSelectionStrategyFactory`**: resolve `round_robin` ou `random` via env.
- **Strategies de seleção** (`RoundRobinStrategy`, `RandomStrategy`): algoritmo de ordenação.
- **Strategies de providers** (`CepProvider`): contrato unificado e URLs fixas.
- **Failover** (no `CepService`): circuito OPEN, timeout, indisponibilidade ou erro de rede tenta o próximo provider; 404 só após esgotar todos.
- **Segurança**: validação estrita de CEP, Helmet, rate limiting, respostas de erro sem vazar detalhes internos.

### Testes

```bash
npm test
```
