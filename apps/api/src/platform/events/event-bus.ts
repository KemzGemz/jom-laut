import { Injectable } from '@nestjs/common';
import { AppLogger } from '../logger/logger.service.js';

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  correlationId?: string;
}

type Handler = (event: DomainEvent) => Promise<void> | void;

/**
 * In-process domain event bus (FR-NOTIF-2, FR-AUDIT-1).
 * Handlers run AFTER the triggering transaction commits and are isolated:
 * a handler failure never propagates back to the core transaction.
 */
@Injectable()
export class EventBus {
  private readonly handlers = new Map<string, Handler[]>();

  constructor(private readonly logger: AppLogger) {}

  subscribe(type: string, handler: Handler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  /** Dispatch an event to all subscribers. Errors are logged, not thrown. */
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const list = [...(this.handlers.get(event.type) ?? []), ...(this.handlers.get('*') ?? [])];
    await Promise.all(
      list.map(async (h) => {
        try {
          await h(event as DomainEvent);
        } catch (err) {
          this.logger.error(
            `Event handler failed for "${event.type}": ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err.stack : undefined,
            'EventBus',
          );
        }
      }),
    );
  }
}
