export class OperationTimeoutError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly timeoutMs: number,
  ) {
    super(
      `Operation timed out after ${timeoutMs}ms in circuit "${circuitName}"`,
    );
    this.name = 'OperationTimeoutError';
  }
}
