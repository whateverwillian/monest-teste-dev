export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  providerSelection: process.env.PROVIDER_SELECTION ?? 'round_robin',
  httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS ?? '5000', 10),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
  },
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD ?? '5', 10),
    openDurationMs: parseInt(process.env.CB_OPEN_DURATION_MS ?? '30000', 10),
    halfOpenMaxCalls: parseInt(process.env.CB_HALF_OPEN_MAX_CALLS ?? '1', 10),
    operationTimeoutMs: parseInt(
      process.env.CB_OPERATION_TIMEOUT_MS ?? '5000',
      10,
    ),
  },
});
