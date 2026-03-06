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
  type SaveData,
  type TransformComponent,
  type VelocityComponent,
  type Vector3,
  type ResourceNodeComponent,
  type BuildingComponent,
  type CitizenComponent,
  type ConstructionWorkComponent,
  type AnimalComponent,
  TRANSFORM,
  VELOCITY,
  CITIZEN,
  BUILDING,
  RESOURCE_NODE,
  STORAGE,
  SELECTABLE,
  CARRY,
  JOB_ASSIGNMENT,
  GATHERING,
  CONSTRUCTION_WORK,
  CONSTRUCTION_SITE,
  DEPLETED_RESOURCE,
  EQUIPMENT,
  ANIMAL,
  CitizenState,
  Gender,
  Mood,
  LifeGoal,
  createAnimal,
  type AnimalType,
  type GatheringComponent,
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
  createEquipment,
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
  ResourceDepletionSystem,
  BuildingPlacementSystem,
  TerrainGenerator,
  BUILDING_DEFS,
  DEFAULT_GAME_CONFIG,
  AnimalAISystem,
  AutoBuilderSystem,
  CitizenNeedsSystem,
  deserialize,
} from '@augmented-survival/game-core';
import { MeshFactory } from '../assets/MeshFactory.js';
import { TerrainMesh, getMaxHeightForFootprint } from '../world/TerrainMesh.js';
import { EnvironmentObjects } from '../world/EnvironmentSystem.js';
import { CitizenAnimator } from '../animation/CitizenAnimator.js';
import { AnimalAnimator } from '../animation/AnimalAnimator.js';

const MALE_NAMES = ['Aldric', 'Cedric', 'Edmund', 'Gilbert', 'Ivar'];
const FEMALE_NAMES = ['Beatrice', 'Dorothea', 'Fiona', 'Helena', 'Juliana'];


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

  // Walk animation controllers for citizen entities
  private citizenAnimators = new Map<EntityId, CitizenAnimator>();

  // Walk animation controllers for animal entities
  private animalAnimators = new Map<EntityId, AnimalAnimator>();

  // Tool meshes attached to citizens during gathering
  private citizenTools = new Map<EntityId, THREE.Group>();

  // Entity → environment instance mapping for hide/show on depletion
  private resourceInstanceMap = new Map<EntityId, { type: string; index: number }>();


  // Track building footprints for terrain modification exclude zones
  private buildingFootprints: Array<{x: number, z: number, width: number, depth: number}> = [];

  constructor(scene: THREE.Scene, initialSaveData?: SaveData) {
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
    movement.setTerrainData(terrainData);
    const gather = new GatherSystem(this.timeSystem, this.eventBus);
    const resourceDepletion = new ResourceDepletionSystem(this.timeSystem, this.eventBus);
    const carry = new CarrySystem();
    const delivery = new DeliverySystem(this.timeSystem, this.eventBus);
    const construction = new ConstructionSystem(this.timeSystem, this.eventBus);
    const autoBuilder = new AutoBuilderSystem(this.eventBus);
    const citizenNeeds = new CitizenNeedsSystem(this.timeSystem);
    this.resourceStore = new ResourceStoreSystem(this.eventBus);
    this.buildingPlacement = new BuildingPlacementSystem(this.eventBus);

    const animalAI = new AnimalAISystem(this.timeSystem);
    animalAI.setTerrainData(terrainData);
    animalAI.setMapSize(128);
    animalAI.setCenterPosition({ x: 0, y: 0, z: 0 });

    this.world.addSystem(this.timeSystem);
    this.world.addSystem(jobAssignment);
    this.world.addSystem(pathFollow);
    this.world.addSystem(movement);
    this.world.addSystem(gather);
    this.world.addSystem(resourceDepletion);
    this.world.addSystem(carry);
    this.world.addSystem(delivery);
    this.world.addSystem(construction);
    this.world.addSystem(autoBuilder);
    this.world.addSystem(citizenNeeds);
    this.world.addSystem(this.resourceStore);
    this.world.addSystem(this.buildingPlacement);
    this.world.addSystem(animalAI);

    if (initialSaveData) {
      deserialize(initialSaveData, this.world, this.resourceStore, this.timeSystem);
      this.rebuildRuntimeStateFromWorld();
    } else {
      this.initializeFreshWorld();
    }

    // 9. Listen to events for visual updates
    this.setupEventListeners();
  }

  private initializeFreshWorld(): void {

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

    // 8. Spawn initial animals near town center
    this.spawnInitialAnimals();
  }

  private rebuildRuntimeStateFromWorld(): void {
    this.clearRuntimeState();
    this.resourceInstanceMap.clear();
    this.buildingFootprints = [];

    for (const entityId of this.world.query(SELECTABLE)) {
      const selectable = this.world.getComponent<{ selected: boolean; hoverHighlight: boolean }>(entityId, SELECTABLE);
      if (selectable) {
        selectable.selected = false;
        selectable.hoverHighlight = false;
      }
    }

    this.rebuildBuildingVisuals();
    this.rebuildResourceInstanceMap();
    this.syncLoadedResourceVisuals();
    this.rebuildCitizenVisuals();
    this.rebuildAnimalVisuals();
  }

  private spawnTownCenter(): void {
    const def = BUILDING_DEFS[BuildingType.TownCenter];
    const entityId = this.world.createEntity();
    const y = getMaxHeightForFootprint(this.terrainMesh, 0, 0, def.size.width, def.size.depth);
    const position = { x: 0, y, z: 0 };
    this.world.addComponent(entityId, TRANSFORM, createTransform(position));
    this.world.addComponent(entityId, BUILDING, createBuilding(BuildingType.TownCenter, def.workerSlots, true));
    this.world.addComponent(entityId, STORAGE, createStorage(def.storageCapacity));
    this.world.addComponent(entityId, SELECTABLE, createSelectable());

    this.raiseTerrainForFootprint(position.x, position.z, def.size.width, def.size.depth, position.y);
    this.raiseTownCenterCampfireTerrain(position);

    const mesh = this.createBuildingVisual(BuildingType.TownCenter, position);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.entityMeshes.set(entityId, mesh);

    // Refresh terrain geometry once after all initial terrain modifications
    this.terrainMesh.refreshGeometry();
  }

  private raiseTerrainForFootprint(
    x: number,
    z: number,
    width: number,
    depth: number,
    targetHeight: number,
  ): void {
    const footprint = { x, z, width, depth };
    this.buildingFootprints.push(footprint);
    this.terrainMesh.raiseTerrainForBuilding(
      x,
      z,
      width,
      depth,
      targetHeight,
      this.buildingFootprints.filter((existing) => existing !== footprint),
    );
  }

  private raiseTownCenterCampfireTerrain(position: Vector3): void {
    const campfireY = getMaxHeightForFootprint(this.terrainMesh, position.x, position.z + 7, 2.6, 2.6);
    this.raiseTerrainForFootprint(position.x, position.z + 7, 2.6, 2.6, campfireY);
  }

  private createBuildingVisual(type: BuildingType, position: Vector3): THREE.Object3D {
    if (type !== BuildingType.TownCenter) {
      return this.meshFactory.createBuildingMesh(type);
    }

    const group = new THREE.Group();
    const townCenter = this.meshFactory.createBuildingMesh(BuildingType.StorageBarn);
    const campfire = this.meshFactory.createCampfire();
    const campfireY = getMaxHeightForFootprint(this.terrainMesh, position.x, position.z + 7, 2.6, 2.6);

    campfire.position.set(0, campfireY - position.y, 7);
    group.add(townCenter);
    group.add(campfire);

    return group;
  }

  private applyConstructionOpacity(mesh: THREE.Object3D): void {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.5;
      }
    });
  }

  private rebuildBuildingVisuals(): void {
    const buildingEntities = this.world.query(BUILDING, TRANSFORM).sort((a, b) => a - b);

    for (const entityId of buildingEntities) {
      const building = this.world.getComponent<BuildingComponent>(entityId, BUILDING);
      const transform = this.world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (!building || !transform) continue;

      const def = BUILDING_DEFS[building.type];
      this.raiseTerrainForFootprint(
        transform.position.x,
        transform.position.z,
        def.size.width,
        def.size.depth,
        transform.position.y,
      );

      if (building.type === BuildingType.TownCenter) {
        this.raiseTownCenterCampfireTerrain(transform.position);
      }
    }

    this.terrainMesh.refreshGeometry();

    for (const entityId of buildingEntities) {
      const building = this.world.getComponent<BuildingComponent>(entityId, BUILDING);
      const transform = this.world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (!building || !transform) continue;

      const mesh = this.createBuildingVisual(building.type, transform.position);
      mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      mesh.castShadow = true;

      if (!building.isConstructed || this.world.hasComponent(entityId, CONSTRUCTION_SITE)) {
        this.applyConstructionOpacity(mesh);
      }

      this.scene.add(mesh);
      this.entityMeshes.set(entityId, mesh);
    }
  }

  private rebuildResourceInstanceMap(): void {
    const resourceEntities = this.world.query(RESOURCE_NODE, TRANSFORM).sort((a, b) => a - b);
    const counters = { tree: 0, rock: 0, iron: 0, gold: 0, hemp: 0, branch: 0 };

    for (const entityId of resourceEntities) {
      const resource = this.world.getComponent<ResourceNodeComponent>(entityId, RESOURCE_NODE);
      if (!resource) continue;

      switch (resource.type) {
        case ResourceType.Wood:
          this.resourceInstanceMap.set(entityId, { type: 'tree', index: counters.tree++ });
          break;
        case ResourceType.Stone:
          this.resourceInstanceMap.set(entityId, { type: 'rock', index: counters.rock++ });
          break;
        case ResourceType.Iron:
          this.resourceInstanceMap.set(entityId, { type: 'iron', index: counters.iron++ });
          break;
        case ResourceType.Gold:
          this.resourceInstanceMap.set(entityId, { type: 'gold', index: counters.gold++ });
          break;
        case ResourceType.Hemp:
          this.resourceInstanceMap.set(entityId, { type: 'hemp', index: counters.hemp++ });
          break;
        case ResourceType.Branch:
          this.resourceInstanceMap.set(entityId, { type: 'branch', index: counters.branch++ });
          break;
      }
    }
  }

  private syncLoadedResourceVisuals(): void {
    const resourceEntities = this.world.query(RESOURCE_NODE).sort((a, b) => a - b);

    for (const entityId of resourceEntities) {
      const resource = this.world.getComponent<ResourceNodeComponent>(entityId, RESOURCE_NODE);
      const instance = this.resourceInstanceMap.get(entityId);
      if (!resource || !instance) continue;

      if (resource.amount <= 0 || this.world.hasComponent(entityId, DEPLETED_RESOURCE)) {
        this.environment.hideResourceInstance(instance.type, instance.index);
      }
    }
  }

  private rebuildCitizenVisuals(): void {
    const citizenEntities = this.world.query(CITIZEN, TRANSFORM).sort((a, b) => a - b);

    for (const entityId of citizenEntities) {
      const transform = this.world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (!transform) continue;

      const mesh = this.meshFactory.createCitizenMesh();
      mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.entityMeshes.set(entityId, mesh);
      this.citizenAnimators.set(entityId, new CitizenAnimator(mesh));
    }
  }

  private rebuildAnimalVisuals(): void {
    const animalEntities = this.world.query(ANIMAL, TRANSFORM).sort((a, b) => a - b);

    for (const entityId of animalEntities) {
      const animal = this.world.getComponent<AnimalComponent>(entityId, ANIMAL);
      const transform = this.world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (!animal || !transform) continue;

      const mesh = animal.type === 'sheep'
        ? this.meshFactory.createSheepMesh()
        : this.meshFactory.createChickenMesh();
      mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.entityMeshes.set(entityId, mesh);
      this.animalAnimators.set(entityId, new AnimalAnimator(mesh, animal.type));
    }
  }

  private clearRuntimeState(): void {
    for (const mesh of this.entityMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.entityMeshes.clear();
    this.citizenAnimators.clear();
    this.animalAnimators.clear();

    for (const tool of this.citizenTools.values()) {
      tool.removeFromParent();
    }
    this.citizenTools.clear();
  }

  private createResourceEntities(): void {
    let treeIndex = 0;
    // Trees → Wood resource nodes
    for (const pos of this.environment.getTreePositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Wood, 2, 2));
      this.world.addComponent(entity, SELECTABLE, createSelectable());
      this.resourceInstanceMap.set(entity, { type: 'tree', index: treeIndex++ });
    }
    let rockIndex = 0;
    // Rocks → Stone resource nodes
    for (const pos of this.environment.getRockPositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Stone, 3, 3));
      this.world.addComponent(entity, SELECTABLE, createSelectable());
      this.resourceInstanceMap.set(entity, { type: 'rock', index: rockIndex++ });
    }
    let ironIndex = 0;
    // Iron ore rocks → Iron resource nodes
    for (const pos of this.environment.getIronPositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Iron, 2, 2));
      this.world.addComponent(entity, SELECTABLE, createSelectable());
      this.resourceInstanceMap.set(entity, { type: 'iron', index: ironIndex++ });
    }
    let goldIndex = 0;
    // Gold ore rocks → Gold resource nodes
    for (const pos of this.environment.getGoldPositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Gold, 1, 1));
      this.world.addComponent(entity, SELECTABLE, createSelectable());
      this.resourceInstanceMap.set(entity, { type: 'gold', index: goldIndex++ });
    }
    let hempIndex = 0;
    // Hemp plants → Hemp resource nodes (regenerating)
    for (const pos of this.environment.getHempPositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Hemp, 3, 3, true));
      this.world.addComponent(entity, SELECTABLE, createSelectable());
      this.resourceInstanceMap.set(entity, { type: 'hemp', index: hempIndex++ });
    }
    let branchIndex = 0;
    // Fallen branches → Branch resource nodes (regenerating)
    for (const pos of this.environment.getBranchPositions()) {
      const entity = this.world.createEntity();
      this.world.addComponent(entity, TRANSFORM, createTransform(pos));
      this.world.addComponent(entity, RESOURCE_NODE, createResourceNode(ResourceType.Branch, 2, 2, true));
      this.world.addComponent(entity, SELECTABLE, createSelectable());
      this.resourceInstanceMap.set(entity, { type: 'branch', index: branchIndex++ });
    }
  }

  spawnCitizen(position?: Vector3, jobType?: JobType): EntityId {
    const pos = position ?? {
      x: (Math.random() - 0.5) * 8,
      y: 0,
      z: (Math.random() - 0.5) * 8,
    };
    pos.y = this.terrainMesh.getHeightAt(pos.x, pos.z);

    // Determine job: use provided jobType, or default to Idle (wander)
    const assignedJob = jobType ?? JobType.Idle;

    // Random gender 50/50 and matching name
    const gender = Math.random() < 0.5 ? Gender.Male : Gender.Female;
    const names = gender === Gender.Male ? MALE_NAMES : FEMALE_NAMES;
    const name = names[Math.floor(Math.random() * names.length)];

    // Random age between 18 and 65
    const age = 18 + Math.floor(Math.random() * 48);

    // Random life goal
    const lifeGoals = Object.values(LifeGoal);
    const lifeGoal = lifeGoals[Math.floor(Math.random() * lifeGoals.length)];

    const entity = this.world.createEntity();
    this.world.addComponent(entity, TRANSFORM, createTransform(pos));
    this.world.addComponent(entity, VELOCITY, createVelocity());
    this.world.addComponent(entity, CITIZEN, createCitizen(
      name, gender, jobType ?? null, CitizenState.Idle, 100, 100, 0, 0, Mood.Neutral, age, lifeGoal,
    ));
    this.world.addComponent(entity, CARRY, createCarry());
    this.world.addComponent(entity, SELECTABLE, createSelectable());
    this.world.addComponent(entity, JOB_ASSIGNMENT, createJobAssignment(assignedJob));
    this.world.addComponent(entity, EQUIPMENT, createEquipment());

    // Create citizen mesh
    const mesh = this.meshFactory.createCitizenMesh();
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.entityMeshes.set(entity, mesh);

    // Create walk animator
    const animator = new CitizenAnimator(mesh);
    this.citizenAnimators.set(entity, animator);

    return entity;
  }

  private spawnInitialAnimals(): void {
    const sheepCount = 2 + Math.floor(Math.random() * 2);
    const chickenCount = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < sheepCount; i++) {
      this.spawnAnimal('sheep');
    }

    for (let i = 0; i < chickenCount; i++) {
      this.spawnAnimal('chicken');
    }
  }

  private spawnAnimal(type: AnimalType): EntityId {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 8;
    const pos = {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
    };
    pos.y = this.terrainMesh.getHeightAt(pos.x, pos.z);

    const entity = this.world.createEntity();
    this.world.addComponent(entity, TRANSFORM, createTransform(pos));
    this.world.addComponent(entity, VELOCITY, createVelocity());
    this.world.addComponent(entity, ANIMAL, createAnimal(type));
    this.world.addComponent(entity, SELECTABLE, createSelectable());

    const mesh = type === 'sheep'
      ? this.meshFactory.createSheepMesh()
      : this.meshFactory.createChickenMesh();
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.entityMeshes.set(entity, mesh);

    const animator = new AnimalAnimator(mesh, type);
    this.animalAnimators.set(entity, animator);

    return entity;
  }

  placeBuilding(type: BuildingType, position: Vector3): EntityId | null {
    const def = BUILDING_DEFS[type];
    if (!this.resourceStore.canAfford(def.cost)) return null;
    this.resourceStore.deduct(def.cost);

    position.y = getMaxHeightForFootprint(this.terrainMesh, position.x, position.z, def.size.width, def.size.depth);

    const entityId = this.buildingPlacement.placeBuilding(this.world, type, position, {
      cost: def.cost,
      workerSlots: def.workerSlots,
      storageCapacity: def.storageCapacity,
      buildTime: def.buildTime,
    });

    if (entityId != null) {
      const mesh = this.createBuildingVisual(type, position);
      mesh.position.set(position.x, position.y, position.z);
      mesh.castShadow = true;

      this.raiseTerrainForFootprint(position.x, position.z, def.size.width, def.size.depth, position.y);
      this.terrainMesh.refreshGeometry();

      this.applyConstructionOpacity(mesh);
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

      // Spawn a villager when a House is completed, if under population cap
      if (event.buildingType === BuildingType.House) {
        const citizenCount = this.world.query(CITIZEN).length;

        // Calculate max population from all constructed buildings
        const buildingEntities = this.world.query(BUILDING);
        let maxPop = 0;
        for (const eid of buildingEntities) {
          const bComp = this.world.getComponent<BuildingComponent>(eid, BUILDING);
          if (bComp && bComp.isConstructed) {
            const def = BUILDING_DEFS[bComp.type];
            if (def) {
              maxPop += def.providesPopulation;
            }
          }
        }

        if (citizenCount < maxPop) {
          const transform = this.world.getComponent<TransformComponent>(event.buildingId, TRANSFORM);
          if (transform) {
            const spawnPos: Vector3 = {
              x: transform.position.x + (Math.random() - 0.5) * 2,
              y: transform.position.y,
              z: transform.position.z + (Math.random() - 0.5) * 2,
            };
            this.spawnCitizen(spawnPos);
          }
        }
      }
    });

    // When a gather hit occurs, start gathering animation if not already active
    this.eventBus.on('GatherHit', (event) => {
      const animator = this.citizenAnimators.get(event.entityId);
      if (!animator) return;

      // If not already in gathering mode, start it
      if (!animator.isInGatheringMode()) {
        // Create appropriate tool
        const tool = event.resourceType === ResourceType.Wood
          ? this.meshFactory.createAxeMesh()
          : event.resourceType === ResourceType.Stone
            ? this.meshFactory.createPickaxeMesh()
            : null;

        if (tool) {
          this.citizenTools.set(event.entityId, tool);
        }

        // Get hit interval from gathering component
        const gathering = this.world.getComponent<GatheringComponent>(event.entityId, GATHERING);
        const hitInterval = gathering?.hitInterval ?? 1;

        if (tool) {
          const gatherType = event.resourceType === ResourceType.Wood ? 'chop' as const : 'mine' as const;
          animator.startGathering(hitInterval, tool, gatherType);
        }
      }

      // Reset the swing phase on each hit so the animation stays in sync
      animator.resetGatherPhase();
    });

    // When a resource is depleted, hide its visual instance
    this.eventBus.on('ResourceDepleted', (event) => {
      const info = this.resourceInstanceMap.get(event.entityId);
      if (info) {
        this.environment.hideResourceInstance(info.type, info.index);
      }
    });

    // When a resource respawns, show its visual instance again
    this.eventBus.on('ResourceRespawned', (event) => {
      const info = this.resourceInstanceMap.get(event.entityId);
      if (info) {
        this.environment.showResourceInstance(info.type, info.index);
      }
    });

    // When a building destroy is requested, refund resources, unassign workers, remove mesh, destroy entity
    this.eventBus.on('BuildingDestroyRequested', (event) => {
      const entityId = event.buildingId;
      const building = this.world.getComponent<BuildingComponent>(entityId, BUILDING);
      if (!building) return;

      // 1. Calculate and credit 50% refund (floored)
      const def = BUILDING_DEFS[building.type];
      for (const [rType, amount] of Object.entries(def.cost)) {
        if (amount == null || amount <= 0) continue;
        const refund = Math.floor(amount / 2);
        if (refund <= 0) continue;
        const current = this.resourceStore.getResource(rType as ResourceType);
        this.resourceStore.setResource(rType as ResourceType, current + refund);
      }

      // 2. Unassign construction workers targeting this building
      const constructionWorkers = this.world.query(CONSTRUCTION_WORK);
      for (const workerId of constructionWorkers) {
        const work = this.world.getComponent<ConstructionWorkComponent>(workerId, CONSTRUCTION_WORK);
        if (work && (work.targetBuilding as EntityId) === entityId) {
          this.world.removeComponent(workerId, CONSTRUCTION_WORK);
          const citizen = this.world.getComponent<CitizenComponent>(workerId, CITIZEN);
          if (citizen) {
            const oldState = citizen.state;
            citizen.state = CitizenState.Idle;
            this.eventBus.emit('CitizenStateChanged', { entityId: workerId, oldState, newState: CitizenState.Idle });
          }
        }
      }

      // 3. Unassign building workers (clear the workers array)
      for (const workerId of building.workers) {
        if (this.world.hasComponent(workerId, JOB_ASSIGNMENT)) {
          this.world.removeComponent(workerId, JOB_ASSIGNMENT);
        }
        const citizen = this.world.getComponent<CitizenComponent>(workerId, CITIZEN);
        if (citizen) {
          const oldState = citizen.state;
          citizen.state = CitizenState.Idle;
          citizen.job = null;
          this.eventBus.emit('CitizenStateChanged', { entityId: workerId, oldState, newState: CitizenState.Idle });
        }
      }

      // 4. Remove 3D mesh
      const mesh = this.entityMeshes.get(entityId);
      if (mesh) {
        this.scene.remove(mesh);
        this.entityMeshes.delete(entityId);
      }

      // 5. Destroy the ECS entity
      this.world.destroyEntity(entityId);

      // 6. Close the selection panel
      this.eventBus.emit('EntityDeselected', { entityId });
    });

    // When a citizen enters Building state, start hammer animation
    this.eventBus.on('CitizenStateChanged', (event) => {
      if (event.newState === CitizenState.Building) {
        const animator = this.citizenAnimators.get(event.entityId);
        if (!animator || animator.isInGatheringMode()) return;

        const hammer = this.meshFactory.createHammerMesh();
        this.citizenTools.set(event.entityId, hammer);
        animator.startGathering(1.0, hammer, 'build');

        // Face the villager toward the target building
        const work = this.world.getComponent<ConstructionWorkComponent>(event.entityId, CONSTRUCTION_WORK);
        if (work) {
          const targetTransform = this.world.getComponent<TransformComponent>(work.targetBuilding as EntityId, TRANSFORM);
          const workerTransform = this.world.getComponent<TransformComponent>(event.entityId, TRANSFORM);
          if (targetTransform && workerTransform) {
            const dx = targetTransform.position.x - workerTransform.position.x;
            const dz = targetTransform.position.z - workerTransform.position.z;
            animator.setFacingTarget(dx, dz);
          }
        }
      }
    });
  }

  /** Call every frame to step simulation and sync visuals */
  update(dt: number): void {
    // Step ECS world
    this.world.step(dt);

    // Update environment animations (e.g. falling trees)
    this.environment.update(dt);

    // Sync ECS transforms → Three.js meshes
    this.syncMeshPositions(dt);
  }

  private syncMeshPositions(dt: number): void {
    for (const [entityId, mesh] of this.entityMeshes) {
      const transform = this.world.getComponent<TransformComponent>(entityId, TRANSFORM);
      if (transform) {
        mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      }

      // Animate citizens
      const animator = this.citizenAnimators.get(entityId);
      if (animator) {
        // Check if citizen was building but no longer has CONSTRUCTION_WORK component
        if (animator.isInGatheringMode() && animator.getGatherType() === 'build') {
          if (!this.world.hasComponent(entityId, CONSTRUCTION_WORK)) {
            animator.stopGathering();
            const tool = this.citizenTools.get(entityId);
            if (tool) {
              tool.removeFromParent();
              this.citizenTools.delete(entityId);
            }
          } else {
            // Face the target building while building
            const work = this.world.getComponent<ConstructionWorkComponent>(entityId, CONSTRUCTION_WORK);
            if (work) {
              const targetTransform = this.world.getComponent<TransformComponent>(work.targetBuilding as EntityId, TRANSFORM);
              if (targetTransform && transform) {
                const dx = targetTransform.position.x - transform.position.x;
                const dz = targetTransform.position.z - transform.position.z;
                animator.setFacingTarget(dx, dz);
              }
            }
          }
        }

        // Check if citizen was gathering but no longer has GATHERING component
        if (animator.isInGatheringMode() && animator.getGatherType() !== 'build') {
          if (!this.world.hasComponent(entityId, GATHERING)) {
            animator.stopGathering();
            const tool = this.citizenTools.get(entityId);
            if (tool) {
              tool.removeFromParent();
              this.citizenTools.delete(entityId);
            }
          }
        }

        // If gathering (not building), make citizen face the target resource
        if (animator.isInGatheringMode() && animator.getGatherType() !== 'build') {
          const gathering = this.world.getComponent<GatheringComponent>(entityId, GATHERING);
          if (gathering?.targetEntity != null) {
            const targetTransform = this.world.getComponent<TransformComponent>(gathering.targetEntity, TRANSFORM);
            if (targetTransform && transform) {
              const dx = targetTransform.position.x - transform.position.x;
              const dz = targetTransform.position.z - transform.position.z;
              animator.setFacingTarget(dx, dz);
            }
          }
        }

        const vel = this.world.getComponent<VelocityComponent>(entityId, VELOCITY);
        const vx = vel?.velocity.x ?? 0;
        const vz = vel?.velocity.z ?? 0;
        animator.update(dt, vx, vz);
      }

      // Animate animals
      const animalAnimator = this.animalAnimators.get(entityId);
      if (animalAnimator) {
        const vel = this.world.getComponent<VelocityComponent>(entityId, VELOCITY);
        const vx = vel?.velocity.x ?? 0;
        const vz = vel?.velocity.z ?? 0;
        animalAnimator.update(dt, vx, vz);
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
    this.clearRuntimeState();
    this.resourceInstanceMap.clear();
    this.buildingFootprints = [];
    this.eventBus.clear();
    this.terrainMesh.dispose();
    this.environment.dispose();
    this.meshFactory.dispose();
  }
}

