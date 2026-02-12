import { System } from '../ecs/System';
import type { World } from '../ecs/World';

/**
 * Interface for the trade system.
 * TODO: Implement caravan-based trade between settlements.
 * - Send caravans with goods to other settlements
 * - Receive incoming trade offers
 * - Dynamic pricing based on supply/demand
 */
export interface ITradeSystem {
  /** Send a caravan with goods to a destination settlement. */
  sendCaravan(destination: string, goods: Map<string, number>): void;

  /** Process an incoming trade from another settlement. */
  receiveTrade(source: string): void;

  /** Get current market prices for all tradeable goods. */
  getPrices(): Map<string, number>;
}

/**
 * Stub implementation of the trade system.
 * All methods are no-ops; returns empty data.
 */
export class TradeSystemStub extends System implements ITradeSystem {
  constructor() {
    super('TradeSystem');
  }

  sendCaravan(_destination: string, _goods: Map<string, number>): void {
    // TODO: Implement caravan dispatch logic
  }

  receiveTrade(_source: string): void {
    // TODO: Implement incoming trade processing
  }

  getPrices(): Map<string, number> {
    // TODO: Implement dynamic pricing
    return new Map();
  }

  update(_world: World, _dt: number): void {
    // TODO: Update active caravans, process trade routes
  }
}

