import { CircuitState } from './circuit-breaker-state.enum';

export interface ICircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  getName(): string;
}
