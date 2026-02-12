/**
 * Type-safe event handler.
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Map of event type strings to their data types.
 * Extend this interface to add new event types.
 */
export interface EventMap {
  [eventType: string]: unknown;
}

/**
 * Typed event bus — publish/subscribe system for game events.
 */
export class EventBus<TEvents extends EventMap = EventMap> {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private onceHandlers = new Map<string, Set<EventHandler<any>>>();

  /**
   * Subscribe to an event type.
   */
  on<K extends keyof TEvents & string>(
    eventType: K,
    handler: EventHandler<TEvents[K]>,
  ): void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
  }

  /**
   * Unsubscribe from an event type.
   */
  off<K extends keyof TEvents & string>(
    eventType: K,
    handler: EventHandler<TEvents[K]>,
  ): void {
    const set = this.handlers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
    // Also remove from once handlers
    const onceSet = this.onceHandlers.get(eventType);
    if (onceSet) {
      onceSet.delete(handler);
      if (onceSet.size === 0) {
        this.onceHandlers.delete(eventType);
      }
    }
  }

  /**
   * Subscribe to an event type, but only fire once.
   */
  once<K extends keyof TEvents & string>(
    eventType: K,
    handler: EventHandler<TEvents[K]>,
  ): void {
    let set = this.onceHandlers.get(eventType);
    if (!set) {
      set = new Set();
      this.onceHandlers.set(eventType, set);
    }
    set.add(handler);
    // Also add to regular handlers so emit finds it
    this.on(eventType, handler);
  }

  /**
   * Emit an event, calling all subscribed handlers.
   */
  emit<K extends keyof TEvents & string>(
    eventType: K,
    data: TEvents[K],
  ): void {
    const set = this.handlers.get(eventType);
    if (!set) return;

    for (const handler of set) {
      handler(data);
    }

    // Remove once handlers after firing
    const onceSet = this.onceHandlers.get(eventType);
    if (onceSet) {
      for (const handler of onceSet) {
        set.delete(handler);
      }
      this.onceHandlers.delete(eventType);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Remove all handlers for all event types.
   */
  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  /**
   * Remove all handlers for a specific event type.
   */
  clearEvent<K extends keyof TEvents & string>(eventType: K): void {
    this.handlers.delete(eventType);
    this.onceHandlers.delete(eventType);
  }
}

