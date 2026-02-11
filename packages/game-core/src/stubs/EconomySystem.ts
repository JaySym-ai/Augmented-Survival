import { System } from '../ecs/System';
import type { World } from '../ecs/World';

/**
 * Interface for the economy system.
 * TODO: Implement taxation, income tracking, and expense management.
 * - Tax rate affects citizen happiness and treasury income
 * - Track income from trade, production, and taxes
 * - Track expenses from wages, maintenance, and military
 */
export interface IEconomySystem {
  /** Set the global tax rate (0.0 to 1.0). */
  setTaxRate(rate: number): void;

  /** Get total income per cycle. */
  getIncome(): number;

  /** Get total expenses per cycle. */
  getExpenses(): number;
}

/**
 * Stub implementation of the economy system.
 * All methods are no-ops; returns 0 for numeric values.
 */
export class EconomySystemStub extends System implements IEconomySystem {
  constructor() {
    super('EconomySystem');
  }

  setTaxRate(_rate: number): void {
    // TODO: Implement tax rate logic affecting citizen happiness
  }

  getIncome(): number {
    // TODO: Calculate income from trade, production, taxes
    return 0;
  }

  getExpenses(): number {
    // TODO: Calculate expenses from wages, maintenance, military
    return 0;
  }

  update(_world: World, _dt: number): void {
    // TODO: Process economic cycle, collect taxes, pay wages
  }
}

