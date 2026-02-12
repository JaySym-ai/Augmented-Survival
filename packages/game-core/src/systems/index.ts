/**
 * ECS Systems — core simulation logic.
 *
 * Systems must be registered in this order for correct behavior:
 * 1. TimeSystem          — time scale management
 * 2. JobAssignmentSystem  — decides what citizens should do
 * 3. PathFollowSystem     — steers entities along paths
 * 4. MovementSystem       — applies velocity to position
 * 5. GatherSystem         — gathering timer
 * 6. DeliverySystem       — resource drop-off
 * 7. CarrySystem          — carry state management
 * 8. ConstructionSystem   — construction progress
 * 9. ResourceStoreSystem  — global resource tracking (event-driven)
 * 10. BuildingPlacementSystem — user-triggered building placement
 */

export { TimeSystem } from './TimeSystem';
export { MovementSystem } from './MovementSystem';
export { PathFollowSystem } from './PathFollowSystem';
export { JobAssignmentSystem, findNearestEntity, findNearestStorage } from './JobAssignmentSystem';
export { GatherSystem } from './GatherSystem';
export { CarrySystem } from './CarrySystem';
export { DeliverySystem } from './DeliverySystem';
export { ConstructionSystem } from './ConstructionSystem';
export { ResourceStoreSystem } from './ResourceStoreSystem';
export { BuildingPlacementSystem } from './BuildingPlacementSystem';

