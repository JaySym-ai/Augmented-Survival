/**
 * ECS Systems — core simulation logic.
 *
 * Systems must be registered in this order for correct behavior:
 * 1. TimeSystem               — time scale management
 * 2. JobAssignmentSystem      — decides what citizens should do
 * 3. PathFollowSystem         — steers entities along paths
 * 4. MovementSystem           — applies velocity to position
 * 5. GatherSystem             — gathering timer
 * 6. ResourceDepletionSystem  — detects depleted resources and manages respawn timers
 * 7. CarrySystem              — carry state management
 * 8. DeliverySystem           — resource drop-off
 * 9. ConstructionSystem       — construction progress
 * 10. AutoBuilderSystem      — auto-assign/restore temporary builders
 * 11. ResourceStoreSystem     — global resource tracking (event-driven)
 * 11. BuildingPlacementSystem — user-triggered building placement
 */

export { TimeSystem } from './TimeSystem';
export { MovementSystem } from './MovementSystem';
export { PathFollowSystem } from './PathFollowSystem';
export { JobAssignmentSystem, findNearestEntity, findNearestStorage } from './JobAssignmentSystem';
export { GatherSystem } from './GatherSystem';
export { CarrySystem } from './CarrySystem';
export { DeliverySystem } from './DeliverySystem';
export { ConstructionSystem } from './ConstructionSystem';
export { AutoBuilderSystem } from './AutoBuilderSystem';
export { CitizenNeedsSystem } from './CitizenNeedsSystem';
export { ResourceStoreSystem } from './ResourceStoreSystem';
export { BuildingPlacementSystem } from './BuildingPlacementSystem';
export { ResourceDepletionSystem } from './ResourceDepletionSystem';
export { AnimalAISystem } from './AnimalAISystem';

