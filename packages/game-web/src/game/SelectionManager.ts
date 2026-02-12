/**
 * SelectionManager — Click-to-select entities with a yellow ring highlight.
 */
import * as THREE from 'three';
import type { EntityId, EventBus, GameEventMap, TransformComponent } from '@augmented-survival/game-core';
import { TRANSFORM, SELECTABLE } from '@augmented-survival/game-core';
import type { GameWorld } from './GameWorld.js';
import type { RTSCameraController } from '../camera/RTSCameraController.js';

export class SelectionManager {
  private selectedEntity: EntityId | null = null;
  private selectionRing: THREE.Mesh;

  constructor(
    private gameWorld: GameWorld,
    private camera: RTSCameraController,
    private container: HTMLElement,
    private eventBus: EventBus<GameEventMap>,
  ) {
    // Create selection ring (yellow torus)
    const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.visible = false;
    gameWorld.scene.add(this.selectionRing);

    container.addEventListener('click', this.onClick);
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

  update(): void {
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
  }

  dispose(): void {
    this.container.removeEventListener('click', this.onClick);
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.MeshBasicMaterial).dispose();
  }
}

