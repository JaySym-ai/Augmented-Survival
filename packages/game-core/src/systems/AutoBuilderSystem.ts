import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import type { CitizenComponent } from '../ecs/components/CitizenComponent';
import { JOB_ASSIGNMENT } from '../ecs/components/JobAssignmentComponent';
import type { JobAssignmentComponent } from '../ecs/components/JobAssignmentComponent';
import { CONSTRUCTION_WORK } from '../ecs/components/ConstructionWorkComponent';
import { CONSTRUCTION_SITE } from '../ecs/components/ConstructionSiteComponent';
import { PATH_FOLLOW } from '../ecs/components/PathFollowComponent';
import { GATHERING } from '../ecs/components/GatheringComponent';
import { CARRY } from '../ecs/components/CarryComponent';
import type { CarryComponent } from '../ecs/components/CarryComponent';
import { TEMPORARY_BUILDER } from '../ecs/components/TemporaryBuilderComponent';
import type { TemporaryBuilderComponent } from '../ecs/components/TemporaryBuilderComponent';
import { JobType } from '../types/jobs';
import { CitizenState } from '../types/citizens';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';

function distanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/**
 * AutoBuilderSystem — auto-assigns idle villagers as temporary builders
 * when buildings are placed, and restores their previous job when
 * construction completes or the building is destroyed.
 */
export class AutoBuilderSystem extends System {
  private pendingAutoAssign: EntityId[] = [];
  private pendingRestore: EntityId[] = [];
  private pendingCleanup: EntityId[] = [];

  constructor(private eventBus: EventBus<GameEventMap>) {
    super('AutoBuilderSystem');

    this.eventBus.on('BuildingPlaced', (e) => {
      this.pendingAutoAssign.push(e.buildingId);
    });

    this.eventBus.on('ConstructionComplete', (e) => {
      this.pendingRestore.push(e.buildingId);
    });

    this.eventBus.on('BuildingDestroyRequested', (e) => {
      this.pendingCleanup.push(e.buildingId);
    });
  }

  update(world: World, _dt: number): void {
    // --- Process pending auto-assigns ---
    for (const buildingId of this.pendingAutoAssign) {
      this.autoAssignBuilder(world, buildingId);
    }
    this.pendingAutoAssign.length = 0;

    // --- Process pending restores (construction complete) ---
    for (const buildingId of this.pendingRestore) {
      this.restoreBuilders(world, buildingId);
    }
    this.pendingRestore.length = 0;

    // --- Process pending cleanup (building destroyed) ---
    for (const buildingId of this.pendingCleanup) {
      this.restoreBuilders(world, buildingId);
    }
    this.pendingCleanup.length = 0;

    // --- Cleanup: detect player manual overrides ---
    this.cleanupOverrides(world);
  }

  /**
   * Find the nearest available citizen and assign them as a temporary builder.
   * Prefers idle villagers; falls back to any non-Building villager.
   */
  private autoAssignBuilder(world: World, buildingId: EntityId): void {
    // Verify building still has a construction site
    if (!world.hasComponent(buildingId, CONSTRUCTION_SITE)) return;

    const buildingTransform = world.getComponent<TransformComponent>(buildingId, TRANSFORM);
    if (!buildingTransform) return;

    // Find all citizens with CITIZEN + TRANSFORM
    const citizens = world.query(CITIZEN, TRANSFORM);

    // Two-pass approach: first try idle villagers, then fall back to any non-Building villager
    let bestId: EntityId | null = null;
    let bestDist = Infinity;

    // Pass 1: prefer idle villagers
    for (const entityId of citizens) {
      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
      if (!citizen || citizen.state !== CitizenState.Idle) continue;

      // Skip citizens who already have TEMPORARY_BUILDER
      if (world.hasComponent(entityId, TEMPORARY_BUILDER)) continue;

      // Skip citizens who already have CONSTRUCTION_WORK
      if (world.hasComponent(entityId, CONSTRUCTION_WORK)) continue;

      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (!transform) continue;

      const dist = distanceSq(transform.position, buildingTransform.position);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = entityId;
      }
    }

    // Pass 2: if no idle villager found, pick any non-Building villager
    if (bestId === null) {
      bestDist = Infinity;
      for (const entityId of citizens) {
        const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
        if (!citizen || citizen.state === CitizenState.Building) continue;

        // Skip citizens who already have TEMPORARY_BUILDER
        if (world.hasComponent(entityId, TEMPORARY_BUILDER)) continue;

        const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM);
        if (!transform) continue;

        const dist = distanceSq(transform.position, buildingTransform.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = entityId;
        }
      }
    }

    if (bestId === null) return;

    // Clean up current task components before reassignment
    if (world.hasComponent(bestId, PATH_FOLLOW)) {
      world.removeComponent(bestId, PATH_FOLLOW);
    }
    if (world.hasComponent(bestId, GATHERING)) {
      world.removeComponent(bestId, GATHERING);
    }
    if (world.hasComponent(bestId, CARRY)) {
      world.removeComponent(bestId, CARRY);
    }
    if (world.hasComponent(bestId, CONSTRUCTION_WORK)) {
      world.removeComponent(bestId, CONSTRUCTION_WORK);
    }

    // Save previous job and assign as Builder
    const citizen = world.getComponent<CitizenComponent>(bestId, CITIZEN)!;
    citizen.state = CitizenState.Idle; // Clean slate before job assignment
    const jobAssignment = world.getComponent<JobAssignmentComponent>(bestId, JOB_ASSIGNMENT);

    const previousJobType = jobAssignment ? jobAssignment.jobType : JobType.Idle;

    // Add TemporaryBuilderComponent to save previous state
    world.addComponent<TemporaryBuilderComponent>(bestId, TEMPORARY_BUILDER, {
      previousJobType,
      targetBuilding: buildingId,
    });

    // Update job assignment
    if (jobAssignment) {
      jobAssignment.jobType = JobType.Builder;
    } else {
      world.addComponent<JobAssignmentComponent>(bestId, JOB_ASSIGNMENT, {
        jobType: JobType.Builder,
        workplaceEntity: null,
      });
    }

    // Update citizen job
    citizen.job = JobType.Builder;

    // Emit CitizenAssignedJob event
    this.eventBus.emit('CitizenAssignedJob', {
      entityId: bestId,
      jobType: JobType.Builder,
    });
  }

  /**
   * Restore all temporary builders targeting a specific building.
   */
  private restoreBuilders(world: World, buildingId: EntityId): void {
    const tempBuilders = world.query(TEMPORARY_BUILDER);

    for (const entityId of tempBuilders) {
      const temp = world.getComponent<TemporaryBuilderComponent>(entityId, TEMPORARY_BUILDER);
      if (!temp || (temp.targetBuilding as EntityId) !== buildingId) continue;

      const citizen = world.getComponent<CitizenComponent>(entityId, CITIZEN);
      const jobAssignment = world.getComponent<JobAssignmentComponent>(entityId, JOB_ASSIGNMENT);

      if (jobAssignment) {
        jobAssignment.jobType = temp.previousJobType;
      }
      if (citizen) {
        citizen.job = temp.previousJobType === JobType.Idle ? null : temp.previousJobType;
      }

      world.removeComponent(entityId, TEMPORARY_BUILDER);

      // Emit CitizenAssignedJob event
      this.eventBus.emit('CitizenAssignedJob', {
        entityId,
        jobType: temp.previousJobType,
      });
    }
  }

  /**
   * Detect player manual overrides: if a citizen has TemporaryBuilderComponent
   * but their job is no longer Builder, the player reassigned them manually.
   * Remove the component so we don't try to restore later.
   */
  private cleanupOverrides(world: World): void {
    const tempBuilders = world.query(TEMPORARY_BUILDER);

    for (const entityId of tempBuilders) {
      const jobAssignment = world.getComponent<JobAssignmentComponent>(entityId, JOB_ASSIGNMENT);
      if (!jobAssignment) continue;

      if (jobAssignment.jobType !== JobType.Builder) {
        // Player manually changed the job — respect the override
        world.removeComponent(entityId, TEMPORARY_BUILDER);
      }
    }
  }
}