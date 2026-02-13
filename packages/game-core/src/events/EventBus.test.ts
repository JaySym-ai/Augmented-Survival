import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, EventHandler, EventMap } from './EventBus';

interface TestEventMap extends EventMap {
  userJoined: { userId: string; username: string };
  resourceChanged: { resourceType: string; amount: number };
  gamePaused: void;
}

describe('EventBus', () => {
  let eventBus: EventBus<TestEventMap>;

  beforeEach(() => {
    eventBus = new EventBus<TestEventMap>();
  });

  describe('on()', () => {
    it('should add a handler for an event type', () => {
      const handler = vi.fn();
      eventBus.on('userJoined', handler);
      eventBus.emit('userJoined', { userId: '1', username: 'test' });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '1', username: 'test' });
    });

    it('should allow multiple handlers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('userJoined', handler1);
      eventBus.on('userJoined', handler2);
      eventBus.emit('userJoined', { userId: '1', username: 'test' });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('off()', () => {
    it('should remove a specific handler', () => {
      const handler = vi.fn();
      eventBus.on('userJoined', handler);
      eventBus.off('userJoined', handler);
      eventBus.emit('userJoined', { userId: '1', username: 'test' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should not affect other handlers when removing one', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('userJoined', handler1);
      eventBus.on('userJoined', handler2);
      eventBus.off('userJoined', handler1);
      eventBus.emit('userJoined', { userId: '1', username: 'test' });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('once()', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      eventBus.once('userJoined', handler);
      eventBus.emit('userJoined', { userId: '1', username: 'test1' });
      eventBus.emit('userJoined', { userId: '2', username: 'test2' });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '1', username: 'test1' });
    });

    it('should pass correct data to once handler', () => {
      const handler = vi.fn();
      eventBus.once('resourceChanged', handler);
      eventBus.emit('resourceChanged', { resourceType: 'wood', amount: 10 });
      expect(handler).toHaveBeenCalledWith({ resourceType: 'wood', amount: 10 });
    });
  });

  describe('emit()', () => {
    it('should emit event to all handlers', () => {
      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      handlers.forEach((h) => eventBus.on('resourceChanged', h));
      eventBus.emit('resourceChanged', { resourceType: 'stone', amount: 5 });
      handlers.forEach((h) => expect(h).toHaveBeenCalledTimes(1));
    });

    it('should handle events with void data', () => {
      const handler = vi.fn();
      eventBus.on('gamePaused', handler);
      eventBus.emit('gamePaused', undefined);
      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it('should do nothing when emitting to non-existent event', () => {
      expect(() => {
        eventBus.emit('userJoined', { userId: '1', username: 'test' });
      }).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should remove all handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('userJoined', handler1);
      eventBus.on('resourceChanged', handler2);
      eventBus.clear();
      eventBus.emit('userJoined', { userId: '1', username: 'test' });
      eventBus.emit('resourceChanged', { resourceType: 'wood', amount: 1 });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('clearEvent()', () => {
    it('should remove all handlers for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('userJoined', handler1);
      eventBus.on('resourceChanged', handler2);
      eventBus.clearEvent('userJoined');
      eventBus.emit('userJoined', { userId: '1', username: 'test' });
      eventBus.emit('resourceChanged', { resourceType: 'wood', amount: 1 });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('type safety', () => {
    it('should work with typed event map', () => {
      const bus = new EventBus<TestEventMap>();
      const handler = vi.fn();
      bus.on('userJoined', handler);
      bus.emit('userJoined', { userId: '123', username: 'Alice' });
      expect(handler).toHaveBeenCalledWith({ userId: '123', username: 'Alice' });
    });
  });
});
