/**
 * MeshFactory — Procedural placeholder mesh generation for all building types,
 * citizens, trees, and rocks.
 */
import * as THREE from 'three';
import { BuildingType } from '@augmented-survival/game-core';

export class MeshFactory {
  private meshCache = new Map<string, THREE.BufferGeometry>();
  private materials: Map<string, THREE.MeshStandardMaterial>;

  constructor() {
    this.materials = this.createMaterials();
  }

  // ---- Public API ----

  createBuildingMesh(type: BuildingType): THREE.Group {
    switch (type) {
      case BuildingType.TownCenter:
        return this.createTownCenter();
      case BuildingType.House:
        return this.createHouse();
      case BuildingType.StorageBarn:
        return this.createStorageBarn();
      case BuildingType.WoodcutterHut:
        return this.createWoodcutterHut();
      case BuildingType.FarmField:
        return this.createFarmField();
      case BuildingType.Quarry:
        return this.createQuarry();
      default:
        return this.createFallbackBox();
    }
  }

  createCitizenMesh(): THREE.Group {
    const group = new THREE.Group();
    const skin = this.mat('skin');
    const cloth = this.mat('cloth');

    // Body (capsule-like: cylinder + two hemispheres)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8), cloth);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skin);
    head.position.y = 0.95;
    head.castShadow = true;
    group.add(head);

    // Facial features
    const dark = this.mat('dark');

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, dark);
    leftEye.position.set(-0.05, 0.97, 0.09);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, dark);
    rightEye.position.set(0.05, 0.97, 0.09);
    group.add(rightEye);

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), skin);
    nose.position.set(0, 0.94, 0.11);
    group.add(nose);

    // Mouth
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), dark);
    mouth.position.set(0, 0.91, 0.10);
    group.add(mouth);

    // Arms (pivot at shoulder so they can swing)
    for (const side of [-1, 1]) {
      const armPivot = new THREE.Group();
      armPivot.name = side === -1 ? 'leftArm' : 'rightArm';
      armPivot.position.set(side * 0.22, 0.75, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), cloth);
      arm.position.set(0, -0.175, 0);
      arm.castShadow = true;
      armPivot.add(arm);
      // Hand (small sphere at arm tip)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), skin);
      hand.position.set(0, -0.37, 0);
      hand.castShadow = true;
      armPivot.add(hand);
      group.add(armPivot);
    }

    // Legs (pivot at hip so they can swing)
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.name = side === -1 ? 'leftLeg' : 'rightLeg';
      legPivot.position.set(side * 0.08, 0.30, 0);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), cloth);
      leg.position.set(0, -0.15, 0);
      leg.castShadow = true;
      legPivot.add(leg);
      group.add(legPivot);
    }

    return group;
  }

  createAxeMesh(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.mat('wood');
    const metal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });

    // Handle (thin cylinder)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), wood);
    handle.position.y = -0.175;
    group.add(handle);

    // Blade (flattened box)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.02), metal);
    blade.position.set(0.06, -0.35, 0);
    group.add(blade);

    return group;
  }

  createPickaxeMesh(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.mat('wood');
    const metal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), wood);
    handle.position.y = -0.175;
    group.add(handle);

    // Pick head (two pointed ends)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), metal);
    head.position.set(0, 0, 0);
    group.add(head);

    return group;
  }

  createTreeMesh(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.mat('wood');
    const leaf = this.mat('leaf');

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2.0, 8), wood);
    trunk.position.y = 1.0;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Canopy (layered cones for a pine-like look)
    const canopyPositions = [2.0, 2.6, 3.1];
    const canopyRadii = [1.2, 0.9, 0.5];
    for (let i = 0; i < canopyPositions.length; i++) {
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(canopyRadii[i], 1.0, 8),
        leaf,
      );
      canopy.position.y = canopyPositions[i];
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      group.add(canopy);
    }

    return group;
  }

  createRockMesh(): THREE.Mesh {
    const stone = this.mat('stone');
    // Irregular rock: dodecahedron with some noise
    const geo = new THREE.DodecahedronGeometry(0.6, 1);
    // Slightly deform vertices for organic look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const scale = 0.85 + Math.random() * 0.3;
      pos.setX(i, pos.getX(i) * scale);
      pos.setY(i, pos.getY(i) * (0.6 + Math.random() * 0.4));
      pos.setZ(i, pos.getZ(i) * scale);
    }
    geo.computeVertexNormals();

    const rock = new THREE.Mesh(geo, stone);
    rock.position.y = 0.25;
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }

  createSheepMesh(): THREE.Group {
    const group = new THREE.Group();
    const wool = this.mat('wool');
    const skin = this.mat('skin');
    const dark = this.mat('dark');

    // Fluffy body (multiple overlapping spheres for wool effect)
    const bodySpheres = [
      { pos: [0, 0.6, 0], scale: 0.35 },
      { pos: [0.15, 0.55, 0], scale: 0.25 },
      { pos: [-0.15, 0.55, 0], scale: 0.25 },
      { pos: [0, 0.7, 0], scale: 0.28 },
      { pos: [0, 0.5, 0], scale: 0.28 },
      { pos: [0.12, 0.65, 0.1], scale: 0.2 },
      { pos: [-0.12, 0.65, 0.1], scale: 0.2 },
    ];
    for (const s of bodySpheres) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(s.scale, 8, 8), wool);
      sphere.position.set(s.pos[0], s.pos[1], s.pos[2]);
      sphere.castShadow = true;
      group.add(sphere);
    }

    // Legs (pivot at hip so they can swing)
    const legNames = ['legFL', 'legFR', 'legBL', 'legBR'];
    const legPositions: [number, number, number][] = [
      [0.15, 0.4, 0.12],   // FL
      [-0.15, 0.4, 0.12],  // FR
      [0.15, 0.4, -0.12],  // BL
      [-0.15, 0.4, -0.12], // BR
    ];
    for (let i = 0; i < legPositions.length; i++) {
      const legPivot = new THREE.Group();
      legPivot.name = legNames[i];
      legPivot.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), skin);
      leg.position.set(0, -0.15, 0);
      leg.castShadow = true;
      legPivot.add(leg);
      group.add(legPivot);
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), skin);
    head.position.set(0, 0.75, 0.35);
    head.castShadow = true;
    group.add(head);

    // Ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skin);
      ear.position.set(side * 0.12, 0.85, 0.35);
      ear.scale.set(1, 1.5, 0.5);
      group.add(ear);
    }

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, dark);
      eye.position.set(side * 0.08, 0.78, 0.48);
      group.add(eye);
    }

    // Nose (black)
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dark);
    nose.position.set(0, 0.7, 0.52);
    group.add(nose);

    return group;
  }

  createChickenMesh(): THREE.Group {
    const group = new THREE.Group();
    const chicken = this.mat('chicken');
    const comb = this.mat('comb');
    const beak = this.mat('beak');
    const dark = this.mat('dark');

    // Body (oval shape)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), chicken);
    body.scale.set(1, 0.85, 1.2);
    body.position.set(0, 0.25, 0);
    body.castShadow = true;
    group.add(body);

    // Back feather tuft
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 6), chicken);
    tuft.position.set(0, 0.35, -0.15);
    tuft.rotation.x = -0.3;
    group.add(tuft);

    // Comb (red on top of head)
    const combBase = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), comb);
    combBase.position.set(0, 0.42, 0.05);
    group.add(combBase);
    const combTop = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), comb);
    combTop.position.set(0, 0.48, 0.03);
    group.add(combTop);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), chicken);
    head.position.set(0, 0.32, 0.18);
    head.castShadow = true;
    group.add(head);

    // Beak
    const beakMesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), beak);
    beakMesh.position.set(0, 0.3, 0.28);
    beakMesh.rotation.x = Math.PI / 2;
    group.add(beakMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.02, 6, 6);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, dark);
      eye.position.set(side * 0.05, 0.34, 0.25);
      group.add(eye);
    }

    // Wings
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), chicken);
      wing.scale.set(0.3, 1, 1.5);
      wing.position.set(side * 0.15, 0.25, 0);
      wing.castShadow = true;
      group.add(wing);
    }

    // Legs (pivot at hip so they can swing)
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.name = side === -1 ? 'legL' : 'legR';
      legPivot.position.set(side * 0.06, 0.15, 0.05);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4), beak);
      leg.position.set(0, -0.075, 0);
      leg.castShadow = true;
      legPivot.add(leg);
      group.add(legPivot);
    }

    // Tail feathers
    for (let i = 0; i < 3; i++) {
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), chicken);
      feather.position.set((i - 1) * 0.04, 0.28, -0.22);
      feather.rotation.x = -0.5;
      group.add(feather);
    }

    return group;
  }

  dispose(): void {
    this.meshCache.forEach((geo) => geo.dispose());
    this.meshCache.clear();
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
  }

  // ---- Building creators ----

  private createTownCenter(): THREE.Group {
    const group = new THREE.Group();
    const stone = this.mat('stone');
    const wood = this.mat('wood');
    const thatch = this.createThatchMaterial();

    // Stone base platform
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), stone);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Main building body (wood upper)
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 3.2), wood);
    body.position.y = 1.4;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Peaked roof (cone)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.5, 4), thatch);
    roof.position.y = 3.15;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Corner pillars
    for (const x of [-1.4, 1.4]) {
      for (const z of [-1.4, 1.4]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 6), stone);
        pillar.position.set(x, 1.2, z);
        pillar.castShadow = true;
        group.add(pillar);
      }
    }

    return group;
  }

  private createHouse(): THREE.Group {
    const group = new THREE.Group();
    const brickMaterial = this.createBrickMaterial();
    const wood = this.mat('wood');
    const thatch = this.createThatchMaterial();

    // Walls
    const walls = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), brickMaterial);
    walls.name = 'walls';
    walls.position.y = 0.8;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Triangular roof (cone with 4 sides)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.0, 4), thatch);
    roof.position.y = 2.1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door (dark wood inset)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.05), wood);
    door.position.set(0, 0.4, 1.01);
    group.add(door);

    // Window on right wall (positive X side)
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.8 }),
    );
    windowFrame.position.set(1.01, 0.9, 0);
    group.add(windowFrame);

    const windowGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 }),
    );
    windowGlass.position.set(1.02, 0.9, 0);
    group.add(windowGlass);

    return group;
  }

  private createStorageBarn(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.mat('wood');
    const thatch = this.mat('thatch');

    // Wide low base
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 3), wood);
    base.position.y = 0.7;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Large sloped roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), thatch);
    roof.position.y = 2.0;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Open front (dark inset)
    const opening = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 }),
    );
    opening.position.set(0, 0.6, 1.51);
    group.add(opening);

    return group;
  }

  private createWoodcutterHut(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.mat('wood');
    const thatch = this.mat('thatch');

    // Small timber frame hut
    const hut = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), wood);
    hut.position.y = 0.7;
    hut.castShadow = true;
    hut.receiveShadow = true;
    group.add(hut);

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.8, 4), thatch);
    roof.position.y = 1.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Stacked logs nearby (small cylinders)
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), wood);
      log.rotation.z = Math.PI / 2;
      log.position.set(1.3, 0.1 + i * 0.18, 0.2 * (i % 2 === 0 ? 1 : -1));
      log.castShadow = true;
      group.add(log);
    }

    return group;
  }

  private createFarmField(): THREE.Group {
    const group = new THREE.Group();
    const dirt = this.mat('dirt');
    const leaf = this.mat('leaf');

    // Flat dirt base
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 4), dirt);
    base.position.y = 0.05;
    base.receiveShadow = true;
    group.add(base);

    // Furrow rows
    for (let z = -1.5; z <= 1.5; z += 0.6) {
      const furrow = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.2), dirt);
      furrow.position.set(0, 0.16, z);
      furrow.receiveShadow = true;
      group.add(furrow);

      // Small crop sprouts
      for (let x = -1.5; x <= 1.5; x += 0.5) {
        const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), leaf);
        sprout.position.set(x, 0.3, z);
        group.add(sprout);
      }
    }

    return group;
  }

  private createQuarry(): THREE.Group {
    const group = new THREE.Group();
    const stone = this.mat('stone');
    const dirt = this.mat('dirt');

    // Sunken pit base
    const pit = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), dirt);
    pit.position.y = -0.05;
    pit.receiveShadow = true;
    group.add(pit);

    // Low stone walls around edges
    const wallPositions: [number, number, number, number, number][] = [
      [0, 0.4, -1.4, 3, 0.3],   // back
      [0, 0.4, 1.4, 3, 0.3],    // front
      [-1.4, 0.4, 0, 0.3, 3],   // left
      [1.4, 0.4, 0, 0.3, 3],    // right
    ];
    for (const [x, y, z, w, d] of wallPositions) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), stone);
      wall.position.set(x, y, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }

    // Scattered stone chunks inside
    for (let i = 0; i < 4; i++) {
      const chunk = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.15, 0),
        stone,
      );
      chunk.position.set(
        (Math.random() - 0.5) * 2,
        0.2,
        (Math.random() - 0.5) * 2,
      );
      chunk.castShadow = true;
      group.add(chunk);
    }

    return group;
  }

  private createFallbackBox(): THREE.Group {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.mat('stone'),
    );
    mesh.position.y = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  // ---- Material helpers ----

  private mat(name: string): THREE.MeshStandardMaterial {
    return this.materials.get(name)!;
  }

  private createBrickMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const brickWidth = 64;
    const brickHeight = 32;
    const mortarSize = 4;

    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#FFFFFF';
    for (let row = 0; row < 8; row++) {
      const offset = row % 2 === 0 ? 0 : brickWidth / 2;
      for (let col = -1; col < 5; col++) {
        const x = col * brickWidth + offset;
        const y = row * brickHeight;
        ctx.fillRect(
          x + mortarSize / 2,
          y + mortarSize / 2,
          brickWidth - mortarSize,
          brickHeight - mortarSize,
        );
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xA0522D,
      roughness: 0.8,
      metalness: 0.0,
    });
  }

  private createThatchMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#C4A44A';
    ctx.fillRect(0, 0, 128, 128);

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const shade = Math.random() * 40 - 20;
      const r = Math.min(255, Math.max(0, 196 + shade));
      const g = Math.min(255, Math.max(0, 164 + shade));
      const b = Math.min(255, Math.max(0, 74 + shade));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 2 + Math.random() * 3, 1);
    }

    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.fillStyle = 'rgba(80, 50, 20, 0.15)';
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xC4A44A,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  private createMaterials(): Map<string, THREE.MeshStandardMaterial> {
    const m = new Map<string, THREE.MeshStandardMaterial>();
    m.set('wood', new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8, metalness: 0.0 }));
    m.set('stone', new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0.0 }));
    m.set('plaster', new THREE.MeshStandardMaterial({ color: 0xF5E6CC, roughness: 0.7, metalness: 0.0 }));
    m.set('thatch', new THREE.MeshStandardMaterial({ color: 0xC4A44A, roughness: 0.95, metalness: 0.0 }));
    m.set('dirt', new THREE.MeshStandardMaterial({ color: 0x5C3A1E, roughness: 1.0, metalness: 0.0 }));
    m.set('skin', new THREE.MeshStandardMaterial({ color: 0xE8B89D, roughness: 0.6, metalness: 0.0 }));
    m.set('cloth', new THREE.MeshStandardMaterial({ color: 0x8B2222, roughness: 0.8, metalness: 0.0 }));
    m.set('leaf', new THREE.MeshStandardMaterial({ color: 0x2D5A27, roughness: 0.85, metalness: 0.0 }));
    m.set('water', new THREE.MeshStandardMaterial({ color: 0x4A7A8C, roughness: 0.3, metalness: 0.1 }));
    m.set('dark', new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.0 }));
    m.set('wool', new THREE.MeshStandardMaterial({ color: 0xF5F5F0, roughness: 0.95, metalness: 0.0 }));
    m.set('chicken', new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.0 }));
    m.set('comb', new THREE.MeshStandardMaterial({ color: 0xCC2222, roughness: 0.6, metalness: 0.0 }));
    m.set('beak', new THREE.MeshStandardMaterial({ color: 0xFF8C00, roughness: 0.5, metalness: 0.1 }));
    return m;
  }
}

