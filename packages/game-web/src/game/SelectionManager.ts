/**
 * SelectionManager — Click-to-select entities with a yellow ring highlight.
 * Also handles right-click commands: move-to-ground and gather-resource.
 */
import * as THREE from 'three';
import type {
  EntityId,
  EventBus,
  GameEventMap,
  TransformComponent,
  CitizenComponent,
  ResourceNodeComponent,
  PathFollowComponent,
  CarryComponent,
} from '@augmented-survival/game-core';
import {
  TRANSFORM,
  SELECTABLE,
  CITIZEN,
  RESOURCE_NODE,
  JOB_ASSIGNMENT,
  createJobAssignment,
  JobType,
  PATH_FOLLOW,
  GATHERING,
  CARRY,
  CONSTRUCTION_WORK,
  CitizenState,
  ResourceType,
} from '@augmented-survival/game-core';
import type { GameWorld } from './GameWorld.js';
import type { RTSCameraController } from '../camera/RTSCameraController.js';

/** Movement speed for right-click move commands (matches CITIZEN_SPEED in JobAssignmentSystem) */
const CITIZEN_SPEED = 3;

/** Max pixel distance between mousedown and mouseup to count as a click (not a drag) */
const CLICK_THRESHOLD = 5;

/** Radius for detecting resource nodes on right-click */
const RESOURCE_PICK_RADIUS = 2.5;

/** Data for an active command feedback marker */
interface CommandMarker {
  mesh: THREE.Mesh;
  elapsed: number;
  duration: number;
}

/** Map ResourceType → JobType for right-click resource assignment */
const RESOURCE_JOB_MAP: Partial<Record<ResourceType, JobType>> = {
  [ResourceType.Wood]: JobType.Woodcutter,
  [ResourceType.Stone]: JobType.Quarrier,
  [ResourceType.Iron]: JobType.Miner,
  [ResourceType.Gold]: JobType.Miner,
  [ResourceType.Food]: JobType.Farmer,
  [ResourceType.Hemp]: JobType.Forager,
  [ResourceType.Branch]: JobType.Forager,
};

export class SelectionManager {
  private selectedEntity: EntityId | null = null;
  private selectionRing: THREE.Mesh;
  private commandMarkers: CommandMarker[] = [];

  /** Tracks right-click mousedown position to distinguish click from drag */
  private rightClickStart: { x: number; y: number } | null = null;

  constructor(
    private gameWorld: GameWorld,
    private camera: RTSCameraController,
    private container: HTMLElement,
    private eventBus: EventBus<GameEventMap>,
  ) {
    // Create selection ring (yellow torus)
    const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.renderOrder = 999;
    this.selectionRing.visible = false;
    gameWorld.scene.add(this.selectionRing);

    container.addEventListener('click', this.onClick);
    container.addEventListener('contextmenu', this.onContextMenu);
    container.addEventListener('mousedown', this.onRightMouseDown);
    container.addEventListener('mouseup', this.onRightMouseUp);
  }

  private onClick = (event: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera.camera);

    const hits = raycaster.intersectObject(this.gameWorld.terrainMesh.mesh);
    if (hits.length > 0) {
      const point = hits[0].point;
      const worldPos = { x: point.x, y: point.y, z: point.z };
      const entity = this.gameWorld.getEntityAtPosition(worldPos, 3.5);
      this.select(entity);
    } else {
      this.select(null);
    }
  };

  /** Prevent browser context menu on right-click */
  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  /** Record mouse position on right-click mousedown */
  private onRightMouseDown = (event: MouseEvent): void => {
    if (event.button !== 2) return;
    this.rightClickStart = { x: event.clientX, y: event.clientY };
  };

  /** On right-click mouseup, issue a command if it was a click (not a drag) */
  private onRightMouseUp = (event: MouseEvent): void => {
    if (event.button !== 2 || !this.rightClickStart) return;

    // Check if mouse moved beyond threshold (drag = camera rotation, not a command)
    const dx = event.clientX - this.rightClickStart.x;
    const dy = event.clientY - this.rightClickStart.y;
    this.rightClickStart = null;
    if (Math.sqrt(dx * dx + dy * dy) >= CLICK_THRESHOLD) return;

    // Must have a selected citizen
    if (this.selectedEntity == null) return;
    const world = this.gameWorld.world;
    const citizen = world.getComponent<CitizenComponent>(this.selectedEntity, CITIZEN);
    if (!citizen) return;

    // Raycast to terrain
    const rect = this.container.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera.camera);
    const hits = raycaster.intersectObject(this.gameWorld.terrainMesh.mesh);
    if (hits.length === 0) return;

    const point = hits[0].point;
    const targetPos = { x: point.x, y: point.y, z: point.z };

    // Check for a resource node near the click
    const nearbyEntity = this.gameWorld.getEntityAtPosition(targetPos, RESOURCE_PICK_RADIUS);
    if (nearbyEntity != null) {
      const rn = world.getComponent<ResourceNodeComponent>(nearbyEntity, RESOURCE_NODE);
      if (rn && rn.amount > 0) {
        const jobType = RESOURCE_JOB_MAP[rn.type];
        if (jobType) {
          this.assignJobAndPath(this.selectedEntity, citizen, jobType, nearbyEntity);
          return;
        }
      }
    }

    // No resource node — issue a move command to the ground position
    this.moveToPosition(this.selectedEntity, citizen, targetPos);
  };

  /** Spawn an animated command feedback marker (torus ring) at the given position. */
  private spawnCommandMarker(position: { x: number; y: number; z: number }, color: number): void {
    const geo = new THREE.TorusGeometry(0.9, 0.06, 8, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 999;
    mesh.position.set(position.x, position.y + 0.1, position.z);
    mesh.scale.setScalar(0.6); // starts small
    this.gameWorld.scene.add(mesh);
    this.commandMarkers.push({ mesh, elapsed: 0, duration: 0.6 });
  }

  /**
   * Reassign a citizen's job and path them toward a resource node.
   * Mirrors SelectionPanel.assignJob cleanup logic.
   */
  private assignJobAndPath(
    entityId: EntityId,
    citizen: CitizenComponent,
    jobType: JobType,
    targetEntity: EntityId,
  ): void {
    const world = this.gameWorld.world;

    // 1. Update JOB_ASSIGNMENT component
    world.addComponent(entityId, JOB_ASSIGNMENT, createJobAssignment(jobType));

    // 2. Update citizen component
    citizen.job = jobType;
    citizen.state = CitizenState.Idle;

    // 3. Remove PATH_FOLLOW if present
    if (world.hasComponent(entityId, PATH_FOLLOW)) {
      world.removeComponent(entityId, PATH_FOLLOW);
    }

    // 4. Remove GATHERING if present
    if (world.hasComponent(entityId, GATHERING)) {
      world.removeComponent(entityId, GATHERING);
    }

    // 5. Handle CARRY: if carrying resources, set state to Carrying; otherwise remove
    const carry = world.getComponent<CarryComponent>(entityId, CARRY);
    if (carry && carry.resourceType != null && carry.amount > 0) {
      citizen.state = CitizenState.Carrying;
    } else if (world.hasComponent(entityId, CARRY)) {
      world.removeComponent(entityId, CARRY);
    }

    // 6. Remove CONSTRUCTION_WORK if present
    if (world.hasComponent(entityId, CONSTRUCTION_WORK)) {
      world.removeComponent(entityId, CONSTRUCTION_WORK);
    }

    // 7. Create path to the resource node (unless carrying — system will route to storage)
    if (citizen.state !== CitizenState.Carrying) {
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM);
      const targetTransform = world.getComponent<TransformComponent>(targetEntity, TRANSFORM);
      if (transform && targetTransform) {
        world.addComponent<PathFollowComponent>(entityId, PATH_FOLLOW, {
          path: [{ ...transform.position }, { ...targetTransform.position }],
          currentIndex: 0,
          speed: CITIZEN_SPEED,
        });
      }
    }

    // 8. Spawn orange/amber command marker at the resource node position
    const targetTransformForMarker = world.getComponent<TransformComponent>(targetEntity, TRANSFORM);
    if (targetTransformForMarker) {
      this.spawnCommandMarker(targetTransformForMarker.position, 0xffaa22);
    }
  }

  /**
   * Issue a move command: clear work components and path to the target position.
   */
  private moveToPosition(
    entityId: EntityId,
    citizen: CitizenComponent,
    targetPos: { x: number; y: number; z: number },
  ): void {
    const world = this.gameWorld.world;

    // Remove existing work/path components
    if (world.hasComponent(entityId, PATH_FOLLOW)) {
      world.removeComponent(entityId, PATH_FOLLOW);
    }
    if (world.hasComponent(entityId, GATHERING)) {
      world.removeComponent(entityId, GATHERING);
    }
    if (world.hasComponent(entityId, CONSTRUCTION_WORK)) {
      world.removeComponent(entityId, CONSTRUCTION_WORK);
    }

    // Set citizen to Idle — PathFollowSystem will set it to Walking
    citizen.state = CitizenState.Idle;

    // Create path from current position to target
    const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM);
    if (!transform) return;

    world.addComponent<PathFollowComponent>(entityId, PATH_FOLLOW, {
      path: [{ ...transform.position }, { ...targetPos }],
      currentIndex: 0,
      speed: CITIZEN_SPEED,
    });

    // Spawn green command marker at the move target
    this.spawnCommandMarker(targetPos, 0x44ff44);
  }

  select(entityId: EntityId | null): void {
    // Deselect previous
    if (this.selectedEntity != null) {
      const sel = this.gameWorld.world.getComponent(this.selectedEntity, SELECTABLE);
      if (sel) (sel as { selected: boolean }).selected = false;
      this.eventBus.emit('EntityDeselected', { entityId: this.selectedEntity });
    }

    this.selectedEntity = entityId;

    if (entityId != null) {
      const sel = this.gameWorld.world.getComponent(entityId, SELECTABLE);
      if (sel) (sel as { selected: boolean }).selected = true;
      this.eventBus.emit('EntitySelected', { entityId });
      this.selectionRing.visible = true;
    } else {
      this.selectionRing.visible = false;
    }
  }

  getSelectedEntity(): EntityId | null {
    return this.selectedEntity;
  }

  update(dt: number): void {
    // Move selection ring to follow selected entity
    if (this.selectedEntity != null) {
      const transform = this.gameWorld.world.getComponent<TransformComponent>(
        this.selectedEntity,
        TRANSFORM,
      );
      if (transform) {
        this.selectionRing.position.set(
          transform.position.x,
          transform.position.y + 0.05,
          transform.position.z,
        );
      }
    }

    // Animate command markers
    for (let i = this.commandMarkers.length - 1; i >= 0; i--) {
      const marker = this.commandMarkers[i];
      marker.elapsed += dt;
      const t = marker.elapsed / marker.duration;
      if (t >= 1) {
        // Remove completed marker
        this.gameWorld.scene.remove(marker.mesh);
        marker.mesh.geometry.dispose();
        (marker.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.commandMarkers.splice(i, 1);
      } else {
        // Scale: 0.6 → 1.4
        const scale = 0.6 + 0.8 * t;
        marker.mesh.scale.setScalar(scale);
        // Fade: 0.7 → 0
        (marker.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
      }
    }
  }

  dispose(): void {
    this.container.removeEventListener('click', this.onClick);
    this.container.removeEventListener('contextmenu', this.onContextMenu);
    this.container.removeEventListener('mousedown', this.onRightMouseDown);
    this.container.removeEventListener('mouseup', this.onRightMouseUp);
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.MeshBasicMaterial).dispose();

    // Clean up any remaining command markers
    for (const marker of this.commandMarkers) {
      this.gameWorld.scene.remove(marker.mesh);
      marker.mesh.geometry.dispose();
      (marker.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.commandMarkers.length = 0;
  }
}

