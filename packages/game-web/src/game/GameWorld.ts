/**
 * GameWorld — Central game orchestrator.
 * Wires ECS World, terrain, environment, systems, and entity-mesh mapping together.
 */
import * as THREE from 'three';
import {
  World,
  EventBus,
  type GameEventMap,
  type EntityId,
  type TransformComponent,
  type Vector3,
  TRANSFORM,
  VELOCITY,
  CITIZEN,
  BUILDING,
  RESOURCE_NODE,
  STORAGE,
  SELECTABLE,
  CARRY,
  JOB_ASSIGNMENT,
  createTransform,
  createVelocity,
  createCitizen,
  createBuilding,
  createResourceNode,
  createStorage,
  createSelectable,
  createCarry,
  createJobAssignment,
  createInventory,
  ResourceType,
  BuildingType,
  JobType,
  TimeSystem,
  MovementSystem,
  PathFollowSystem,
  JobAssignmentSystem,
  GatherSystem,
  CarrySystem,
  DeliverySystem,
  ConstructionSystem,
  ResourceStoreSystem,
  BuildingPlacementSystem,
  TerrainGenerator,
  BUILDING_DEFS,
  DEFAULT_GAME_CONFIG,
} from '@augmented-survival/game-core';
import { MeshFactory } from '../assets/MeshFactory.js';
import { TerrainMesh } from '../world/TerrainMesh.js';
import { EnvironmentObjects } from '../world/EnvironmentSystem.js';

const CITIZEN_NAMES = [
  'Aldric', 'Beatrice', 'Cedric', 'Dorothea', 'Edmund',
  'Fiona', 'Gilbert', 'Helena', 'Ivar', 'Juliana',
];

/** Jobs to cycle through when spawning starting citizens */
const STARTING_JOBS: JobType[] = [JobType.Woodcutter, JobType.Quarrier];

export class GameWorld {
  readonly world: World;
  readonly eventBus: EventBus<GameEventMap>;
  readonly scene: THREE.Scene;
  readonly meshFactory: MeshFactory;
  readonly terrainMesh: TerrainMesh;
  readonly environment: EnvironmentObjects;

  // Systems (public so UI can access)
  readonly timeSystem: TimeSystem;
  readonly resourceStore: ResourceStoreSystem;
  readonly buildingPlacement: BuildingPlacementSystem;

  // Entity-to-mesh mapping
  private entityMeshes = new Map<EntityId, THREE.Object3D>();

  // Round-robin counter for default job assignment
  private nextJobIndex = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.eventBus = new EventBus<GameEventMap>();
    this.world = new World();
    this.meshFactory = new MeshFactory();

    // 1. Generate terrain
    const terrainGen = new TerrainGenerator(42);
    const terrainData = terrainGen.generate(200, 200, 128);
    this.terrainMesh = new TerrainMesh(terrainData);
    scene.add(this.terrainMesh.mesh);

    // 2. Populate environment (trees + rocks as instanced meshes)
    this.environment = new EnvironmentObjects(scene, terrainData, 42);

    // 3. Create and register ALL systems in order
    this.timeSystem = new TimeSystem(this.eventBus);
    const jobAssignment = new JobAssignmentSystem(this.timeSystem, this.eventBus);
    const pathFollow = new PathFollowSystem(this.timeSystem, this.eventBus);
    const movement = new MovementSystem(this.timeSystem);
    const gather = new GatherSystem(this.timeSystem, this.eventBus);
    const carry = new CarrySystem();
    const delivery = new DeliverySystem(this.timeSystem, this.eventBus);
    const construction = new ConstructionSystem(this.eventBus);
    this.resourceStore = new ResourceStoreSystem(this.eventBus);
    this.buildingPlacement = new BuildingPlacementSystem(this.eventBus);

    this.world.addSystem(this.timeSystem);
    this.world.addSystem(jobAssignment);
    this.world.addSystem(pathFollow);
    this.world.addSystem(movement);
    this.world.addSystem(gather);
    this.world.addSystem(carry);
    this.world.addSystem(delivery);
    this.world.addSystem(construction);
    this.world.addSystem(this.resourceStore);
    this.world.addSystem(this.buildingPlacement);

    // 4. Set starting resources
    const config = DEFAULT_GAME_CONFIG;
    for (const [type, amount] of Object.entries(config.startingResources)) {
      if (amount != null) {
        this.resourceStore.setResource(type as ResourceType, amount);
      }
    }

    // 5. Create Town Center entity at center
    this.spawnTownCenter();

    // 6. Create resource node entities from environment positions
    this.createResourceEntities();

    // 7. Spawn starting citizens
    for (let i = 0; i < config.startingCitizens; i++) {
      this.spawnCitizen();
    }

    // 8. Listen to events for visual updates
    this.setupEventListeners();
  }

  private spawnTownCenter(): void {
    const def = BUILDING_DEFS[BuildingType.TownCenter];
    const entityId = this.world.createEntity();
    const y = this.terrainMesh.getHeightAt(0, 0);
    this.world.addComponent(entityId, TRANSFORM, createTransform({ x: 0, y, z: 0 }));
    this.world.addComponent(entityId, BUILDING, createBuilding(BuildingType.TownCenter, def.workerSlots, true));
    this.world.addComponent(entityId, STORAGE, createStorage(def.storageCapacity));
    this.world.addComponent(entityId, SELECTABLE, createSelectable());

    const mesh = this.meshFactory.createBuildingMesh(BuildingType.TownCenter);
    mesh.position.set(0, y, 0);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.entityMeshes.set(entityId, mesh);
  }

  private createResourceEntities(): void {
    // Trees → Wood resource nodes
    for (const pos of this.environment.getTreePositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Wood, 5, 5));
    }
    // Rocks → Stone resource nodes
    for (const pos of this.environment.getRockPositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Stone, 3, 3));
    }
  }

  spawnCitizen(position?: Vector3, jobType?: JobType): EntityId {
    const pos = position ?? {
      x: (Math.random() - 0.5) * 8,
      y: 0,
      z: (Math.random() - 0.5) * 8,
    };
    pos.y = this.terrainMesh.getHeightAt(pos.x, pos.z);

    // Determine job: use provided jobType, or round-robin through STARTING_JOBS
    const assignedJob = jobType ?? STARTING_JOBS[this.nextJobIndex % STARTING_JOBS.length];
    if (jobType == null) {
      this.nextJobIndex++;
    }

    const name = CITIZEN_NAMES[Math.floor(Math.random() * CITIZEN_NAMES.length)];

    const entity = this.world.createEntity();
    this.world.addComponent(entity, TRANSFORM, createTransform(pos));
    this.world.addComponent(entity, VELOCITY, createVelocity());
    this.world.addComponent(entity, CITIZEN, createCitizen(name, assignedJob));
    this.world.addComponent(entity, CARRY, createCarry());
    this.world.addComponent(entity, SELECTABLE, createSelectable());
    this.world.addComponent(entity, JOB_ASSIGNMENT, createJobAssignment(assignedJob));

    // Create citizen mesh
    const mesh = this.meshFactory.createCitizenMesh();
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.entityMeshes.set(entity, mesh);

    return entity;
  }

  placeBuilding(type: BuildingType, position: Vector3): EntityId | null {
    const def = BUILDING_DEFS[type];
    if (!this.resourceStore.canAfford(def.cost)) return null;
    this.resourceStore.deduct(def.cost);

    position.y = this.terrainMesh.getHeightAt(position.x, position.z);

    const entityId = this.buildingPlacement.placeBuilding(this.world, type, position, {
      cost: def.cost,
      workerSlots: def.workerSlots,
      storageCapacity: def.storageCapacity,
    });

    if (entityId != null) {
      // Create ghost/construction mesh (semi-transparent)
      const mesh = this.meshFactory.createBuildingMesh(type);
      mesh.position.set(position.x, position.y, position.z);
      mesh.castShadow = true;
      // Make semi-transparent for under-construction
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      });
      this.scene.add(mesh);
      this.entityMeshes.set(entityId, mesh);
    }
    return entityId;
  }

  private setupEventListeners(): void {
    // When construction completes, make building mesh fully opaque
    this.eventBus.on('ConstructionComplete', (event) => {
      const mesh = this.entityMeshes.get(event.buildingId);
      if (mesh) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }
        });
      }
    });
  }

  /** Call every frame to step simulation and sync visuals */
  update(dt: number): void {
    // Step ECS world
    this.world.step(dt);

    // Sync ECS transforms → Three.js meshes
    this.syncMeshPositions();
  }

  private syncMeshPositions(): void {
    for (const [entityId, mesh] of this.entityMeshes) {
      const transform = this.world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (transform) {
        mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      }
    }
  }

  /** Get entity at screen position for selection */
  getEntityAtPosition(worldPos: Vector3, radius = 1.0): EntityId | null {
    const selectableEntities = this.world.query(TRANSFORM, SELECTABLE);
    let bestId: EntityId | null = null;
    let bestDist = radius * radius;
    for (const eid of selectableEntities) {
      const t = this.world.getComponent<TransformComponent>(eid, TRANSFORM)!;
      const dx = t.position.x - worldPos.x;
      const dz = t.position.z - worldPos.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        bestId = eid;
      }
    }
    return bestId;
  }

  dispose(): void {
    for (const mesh of this.entityMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.entityMeshes.clear();
    this.terrainMesh.dispose();
    this.environment.dispose();
    this.meshFactory.dispose();
  }
}

