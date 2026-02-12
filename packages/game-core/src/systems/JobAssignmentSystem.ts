import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { VELOCITY } from '../ecs/components/VelocityComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { JOB_ASSIGNMENT } from '../ecs/components/JobAssignmentComponent';
import type { JobAssignmentComponent } from '../ecs/components/JobAssignmentComponent';
import { RESOURCE_NODE } from '../ecs/components/ResourceNodeComponent';
import type { ResourceNodeComponent } from '../ecs/components/ResourceNodeComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../ecs/components/BuildingComponent';
import { STORAGE } from '../ecs/components/StorageComponent';
import { PATH_FOLLOW } from '../ecs/components/PathFollowComponent';
import type { PathFollowComponent } from '../ecs/components/PathFollowComponent';
import { GATHERING } from '../ecs/components/GatheringComponent';
import type { GatheringComponent } from '../ecs/components/GatheringComponent';
import { CARRY } from '../ecs/components/CarryComponent';
import type { CarryComponent } from '../ecs/components/CarryComponent';
import { CitizenState } from '../types/citizens';
import { JobType } from '../types/jobs';
import { ResourceType } from '../types/resources';
import { BuildingType } from '../types/buildings';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from './TimeSystem';

/** Default gather time in seconds */
const GATHER_TIME = 3;

/** Default citizen movement speed */
const CITIZEN_SPEED = 3;

/** Min wander radius for idle citizens */
const WANDER_RADIUS_MIN = 5;

/** Max wander radius for idle citizens */
const WANDER_RADIUS_MAX = 8;

/** Cooldown range (seconds) between idle wander paths */
const WANDER_COOLDOWN_MIN = 2;
const WANDER_COOLDOWN_MAX = 4;

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/**
 * Find the nearest entity that has the given component and passes an optional filter.
 */
export function findNearestEntity(
  world: World,
  position: Vector3,
  componentName: string,
  filter?: (entityId: EntityId, world: World) => boolean,
): EntityId | null {
  const entities = world.query(TRANSFORM, componentName);
  let bestId: EntityId | null = null;
  let bestDist = Infinity;

  for (const eid of entities) {
    if (filter && !filter(eid, world)) continue;
    const t = world.getComponent<TransformComponent>(eid, TRANSFORM)!;
    const d = distanceSq(position, t.position);
    if (d < bestDist) {
      bestDist = d;
      bestId = eid;
    }
  }
  return bestId;
}

/**
 * Find the nearest building with a STORAGE component.
 */
export function findNearestStorage(world: World, position: Vector3): EntityId | null {
  return findNearestEntity(world, position, STORAGE, (eid, w) => {
    const building = w.getComponent<BuildingComponent>(eid, BUILDING);
    return building ? building.isConstructed : true;
  });
}

/**
 * JobAssignmentSystem — citizen job behavior state machine.
 * Decides what idle/carrying citizens should do based on their job type.
 */
export class JobAssignmentSystem extends System {
  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
  ) {
    super('JobAssignmentSystem');
  }

  update(world: World, dt: number): void {
    if (this.timeSystem.isPaused()) return;

    const scaledDt = this.timeSystem.getScaledDt(dt);
    const entities = world.query(CITIZEN, JOB_ASSIGNMENT);

    for (const entityId of entities) {
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN)!;
      const job = world.getComponent<JobAssignmentComponent>(entityId, JOB_ASSIGNMENT)!;
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (!transform) continue;

      // Tick down wander cooldown
      if (citizen.wanderCooldown > 0) {
        citizen.wanderCooldown = Math.max(0, citizen.wanderCooldown - scaledDt);
      }

      // Only act on Idle or Carrying citizens
      if (citizen.state === CitizenState.Idle) {
        this.handleIdle(world, entityId, citizen, job, transform);
      } else if (citizen.state === CitizenState.Carrying) {
        this.handleCarrying(world, entityId, citizen, transform);
      }
    }
  }

  private handleIdle(
    world: World,
    entityId: EntityId,
    citizen: CitizenComponent,
    job: JobAssignmentComponent,
    transform: TransformComponent,
  ): void {
    const pos = transform.position;

    switch (job.jobType) {
      case JobType.Woodcutter: {
        // Find nearest tree (ResourceNode with type Wood that has amount > 0)
        const target = findNearestEntity(world, pos, RESOURCE_NODE, (eid, w) => {
          const rn = w.getComponent<ResourceNodeComponent>(eid, RESOURCE_NODE)!;
          return rn.type === ResourceType.Wood && rn.amount > 0;
        });
        if (target != null) {
          this.pathToTarget(world, entityId, citizen, transform, target);
        }
        break;
      }
      case JobType.Farmer: {
        // Find nearest FarmField building that is constructed
        const target = findNearestEntity(world, pos, BUILDING, (eid, w) => {
          const b = w.getComponent<BuildingComponent>(eid, BUILDING)!;
          return b.type === BuildingType.FarmField && b.isConstructed;
        });
        if (target != null) {
          this.pathToTarget(world, entityId, citizen, transform, target);
        }
        break;
      }
      case JobType.Quarrier: {
        // Find nearest rock (ResourceNode with type Stone that has amount > 0)
        const target = findNearestEntity(world, pos, RESOURCE_NODE, (eid, w) => {
          const rn = w.getComponent<ResourceNodeComponent>(eid, RESOURCE_NODE)!;
          return rn.type === ResourceType.Stone && rn.amount > 0;
        });
        if (target != null) {
          this.pathToTarget(world, entityId, citizen, transform, target);
        }
        break;
      }
      default:
        // Idle, Builder, Hauler — wander randomly when not busy
        this.wanderRandomly(world, entityId, citizen, transform);
        break;
    }
  }

  private handleCarrying(
    world: World,
    entityId: EntityId,
    citizen: CitizenComponent,
    transform: TransformComponent,
  ): void {
    // Already has a path? Don't re-assign
    if (world.getComponent<PathFollowComponent>(entityId, PATH_FOLLOW)) return;

    const storageId = findNearestStorage(world, transform.position);
    if (storageId == null) return;

    const storageTransform = world.getComponent<TransformComponent>(storageId, TRANSFORM);
    if (!storageTransform) return;

    // Create path to storage
    const path: Vector3[] = [
      { ...transform.position },
      { ...storageTransform.position },
    ];
    world.addComponent<PathFollowComponent>(entityId, PATH_FOLLOW, {
      path,
      currentIndex: 0,
      speed: CITIZEN_SPEED,
    });

    // Set state to Delivering
    const oldState = citizen.state;
    citizen.state = CitizenState.Delivering;
    this.eventBus.emit('CitizenStateChanged', {
      entityId,
      oldState,
      newState: CitizenState.Delivering,
    });
  }

  private pathToTarget(
    world: World,
    entityId: EntityId,
    citizen: CitizenComponent,
    transform: TransformComponent,
    targetId: EntityId,
  ): void {
    // Already has a path? Don't re-assign
    if (world.getComponent<PathFollowComponent>(entityId, PATH_FOLLOW)) return;

    const targetTransform = world.getComponent<TransformComponent>(targetId, TRANSFORM);
    if (!targetTransform) return;

    // MVP pathfinding: direct line
    const path: Vector3[] = [
      { ...transform.position },
      { ...targetTransform.position },
    ];

    world.addComponent<PathFollowComponent>(entityId, PATH_FOLLOW, {
      path,
      currentIndex: 0,
      speed: CITIZEN_SPEED,
    });

    // Store target info for GatherSystem to use when citizen arrives
    // We use GatheringComponent with elapsed=0 to mark the intent
    const resourceNode = world.getComponent<ResourceNodeComponent>(targetId, RESOURCE_NODE);
    if (resourceNode && resourceNode.amount > 0) {
      const jobAssignment = world.getComponent<JobAssignmentComponent>(entityId, JOB_ASSIGNMENT);
      let resourceType = resourceNode.type;
      // For farmers, resource type is Food
      if (jobAssignment?.jobType === JobType.Farmer) {
        resourceType = ResourceType.Food;
      }
      world.addComponent<GatheringComponent>(entityId, GATHERING, {
        targetEntity: targetId,
        gatherTime: GATHER_TIME,
        elapsed: 0,
        resourceType,
      });
    }
  }

  /**
   * Pick a random nearby point and path to it for idle wandering.
   * Respects a cooldown so citizens pause between wander paths.
   */
  private wanderRandomly(
    world: World,
    entityId: EntityId,
    citizen: CitizenComponent,
    transform: TransformComponent,
  ): void {
    // Don't wander if already following a path
    if (world.getComponent<PathFollowComponent>(entityId, PATH_FOLLOW)) return;

    // Wait for cooldown to expire
    if (citizen.wanderCooldown > 0) return;

    // Pick a random point within WANDER_RADIUS_MIN..WANDER_RADIUS_MAX of current position
    const angle = Math.random() * Math.PI * 2;
    const radius = WANDER_RADIUS_MIN + Math.random() * (WANDER_RADIUS_MAX - WANDER_RADIUS_MIN);
    const dest: Vector3 = {
      x: transform.position.x + Math.cos(angle) * radius,
      y: transform.position.y,
      z: transform.position.z + Math.sin(angle) * radius,
    };

    const path: Vector3[] = [
      { ...transform.position },
      dest,
    ];

    world.addComponent<PathFollowComponent>(entityId, PATH_FOLLOW, {
      path,
      currentIndex: 0,
      speed: CITIZEN_SPEED,
    });

    // Set cooldown so we don't immediately pick a new destination on arrival
    citizen.wanderCooldown =
      WANDER_COOLDOWN_MIN + Math.random() * (WANDER_COOLDOWN_MAX - WANDER_COOLDOWN_MIN);
  }
}

