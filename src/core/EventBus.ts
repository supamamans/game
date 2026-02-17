/**
 * EventBus - Pub/sub system for decoupled communication between game systems.
 *
 * Usage:
 *   EventBus.on('child.feed', handler);
 *   EventBus.emit('child.feed', childId, food);
 *   EventBus.off('child.feed', handler);
 */

type EventHandler = (...args: unknown[]) => void;

class EventBusImpl {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event.
   */
  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event.
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Subscribe to an event, but only fire once then auto-unsubscribe.
   */
  once(event: string, handler: EventHandler): void {
    const wrapper: EventHandler = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit an event to all subscribers.
   */
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`EventBus error in handler for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners (useful for cleanup / scene transitions).
   */
  clear(): void {
    this.listeners.clear();
  }
}

/** Global singleton event bus */
export const EventBus = new EventBusImpl();
