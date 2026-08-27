import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Correlation ID xuyên suốt một request, dùng AsyncLocalStorage.
 *
 * Cùng cơ chế với các service Node khác (xem <service>/src/context/index.js),
 * để `docker compose logs | grep <id>` ghép được log của cả 6 service.
 */
export const CORRELATION_HEADER = 'x-correlation-id';

interface CorrelationStore {
  correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationStore>();

export function newCorrelationId(): string {
  return randomUUID();
}

export function runWithCorrelationId<T>(
  correlationId: string | undefined,
  fn: () => T,
): T {
  return storage.run({ correlationId: correlationId || newCorrelationId() }, fn);
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
