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
    const dark = this.mat('dark');
    const tunic = this.mat('tunic');
    const pantsMat = this.mat('pants');
    const bootsMat = this.mat('boots');
    const beltMat = this.mat('belt');
    const hairMat = this.mat('hair');
    const eyeWhite = this.mat('eyeWhite');

    // ── Body Group (torso, pelvis, belt, collar) ──
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'bodyGroup';
    bodyGroup.position.y = 0.50;

    // Torso — tapered, wider at shoulders, narrower at waist
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.14, 0.30, 10), tunic,
    );
    torso.position.y = 0.10;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Pelvis/hip — wider capsule connecting torso to legs
    const pelvis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.10, 10), pantsMat,
    );
    pelvis.position.y = -0.10;
    pelvis.castShadow = true;
    bodyGroup.add(pelvis);

    // Belt — thin ring at waist
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.145, 0.03, 10), beltMat,
    );
    belt.position.y = -0.04;
    belt.castShadow = true;
    bodyGroup.add(belt);

    // Belt buckle — small box at front
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xB8860B, roughness: 0.4, metalness: 0.6 }),
    );
    buckle.position.set(0, -0.04, 0.14);
    bodyGroup.add(buckle);

    // Collar/neckline — small ring at top of torso
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.10, 0.03, 10), tunic,
    );
    collar.position.y = 0.26;
    collar.castShadow = true;
    bodyGroup.add(collar);

    group.add(bodyGroup);

    // ── Neck ──
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.06, 8), skin,
    );
    neck.position.y = 0.80;
    neck.castShadow = true;
    group.add(neck);

    // ── Head Group (head, hair, face features) ──
    const headGroup = new THREE.Group();
    headGroup.name = 'headGroup';
    headGroup.position.y = 0.93;

    // Head — slightly oval sphere
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12), skin,
    );
    head.scale.set(1, 1.08, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // ── Hair ──
    // Main hair cap — top of head (reduced phi so it sits above eye line)
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat,
    );
    hairTop.position.y = 0.06;
    hairTop.castShadow = true;
    headGroup.add(hairTop);

    // Hair sides — left and right volume
    for (const side of [-1, 1]) {
      const hairSide = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6), hairMat,
      );
      hairSide.position.set(side * 0.09, 0.06, -0.02);
      hairSide.scale.set(0.7, 1.1, 0.9);
      hairSide.castShadow = true;
      headGroup.add(hairSide);
    }

    // Hair back — volume at back of head
    const hairBack = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6), hairMat,
    );
    hairBack.position.set(0, 0.03, -0.08);
    hairBack.scale.set(1, 1.0, 0.7);
    hairBack.castShadow = true;
    headGroup.add(hairBack);

    // ── Face ──
    // Eyes — white base + dark pupil
    for (const side of [-1, 1]) {
      const eyeWhiteMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 8), eyeWhite,
      );
      eyeWhiteMesh.position.set(side * 0.045, 0.02, 0.10);
      headGroup.add(eyeWhiteMesh);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8), dark,
      );
      pupil.position.set(side * 0.045, 0.02, 0.12);
      headGroup.add(pupil);

      // Eyebrow — small flattened box above eye
      const eyebrow = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.008, 0.015), dark,
      );
      eyebrow.position.set(side * 0.045, 0.055, 0.10);
      eyebrow.rotation.x = -0.1;
      headGroup.add(eyebrow);
    }

    // Nose — small protruding shape
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.03, 6), skin,
    );
    nose.position.set(0, -0.005, 0.12);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);

    // Mouth — small dark line
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.008, 0.01), dark,
    );
    mouth.position.set(0, -0.04, 0.11);
    headGroup.add(mouth);

    // Ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 6), skin,
      );
      ear.position.set(side * 0.12, 0.0, 0.0);
      ear.scale.set(0.4, 0.8, 0.6);
      headGroup.add(ear);
    }

    group.add(headGroup);

    // ── Shoulders (rounded caps bridging torso to arms) ──
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 8), tunic,
      );
      shoulder.position.set(side * 0.16, 0.72, 0);
      shoulder.scale.set(1, 0.7, 1);
      shoulder.castShadow = true;
      group.add(shoulder);
    }

    // ── Arms (pivot at shoulder so they can swing) ──
    for (const side of [-1, 1]) {
      const armPivot = new THREE.Group();
      armPivot.name = side === -1 ? 'leftArm' : 'rightArm';
      armPivot.position.set(side * 0.19, 0.72, 0);

      // Upper arm — tunic sleeve
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 0.17, 8), tunic,
      );
      upperArm.position.y = -0.085;
      upperArm.castShadow = true;
      armPivot.add(upperArm);

      // Forearm — skin (rolled-up sleeves look)
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.15, 8), skin,
      );
      forearm.position.y = -0.245;
      forearm.castShadow = true;
      armPivot.add(forearm);

      // Hand — mitten-style rounded box
      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.04), skin,
      );
      hand.position.set(0, -0.37, 0);
      hand.castShadow = true;
      armPivot.add(hand);

      group.add(armPivot);
    }

    // ── Legs (pivot at hip so they can swing) ──
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.name = side === -1 ? 'leftLeg' : 'rightLeg';
      legPivot.position.set(side * 0.07, 0.30, 0);

      // Upper leg (thigh) — slightly thicker
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.15, 8), pantsMat,
      );
      thigh.position.y = -0.075;
      thigh.castShadow = true;
      legPivot.add(thigh);

      // Lower leg (shin) — slightly narrower
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, 0.12, 8), pantsMat,
      );
      shin.position.y = -0.21;
      shin.castShadow = true;
      legPivot.add(shin);

      // Boot — box-like with slight rounding
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.08), bootsMat,
      );
      boot.position.set(0, -0.30, 0.01);
      boot.castShadow = true;
      legPivot.add(boot);

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

  createHammerMesh(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.mat('wood');
    const metal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });

    // Handle (thin cylinder)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), wood);
    handle.position.y = -0.175;
    group.add(handle);

    // Hammer head (rectangular block, perpendicular to handle)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.16), metal);
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

  createCampfire(): THREE.Group {
    const group = new THREE.Group();
    const stone = this.mat('stone');
    const wood = this.mat('wood');
    const dark = this.mat('dark');

    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ── 1. Fire Pit — ring of stones ──
    const stoneCount = 10;
    const pitRadius = 0.45;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const stoneSize = 0.12 + Math.random() * 0.06;
      const stoneGeo = new THREE.DodecahedronGeometry(stoneSize, 0);
      const stoneMesh = shad(new THREE.Mesh(stoneGeo, stone));
      stoneMesh.position.set(
        Math.cos(angle) * pitRadius,
        stoneSize * 0.4,
        Math.sin(angle) * pitRadius,
      );
      stoneMesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, 0);
      stoneMesh.scale.y = 0.6 + Math.random() * 0.3;
      group.add(stoneMesh);
    }

    // Dirt/ash floor inside the pit
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 1.0, metalness: 0.0 });
    const ashFloor = shad(new THREE.Mesh(new THREE.CylinderGeometry(pitRadius - 0.05, pitRadius - 0.05, 0.04, 12), ashMat));
    ashFloor.position.y = 0.02;
    group.add(ashFloor);

    // ── 2. Charred logs in the center ──
    const charredMat = new THREE.MeshStandardMaterial({ color: 0x1A1008, roughness: 0.95, metalness: 0.0 });
    const logPositions: [number, number, number, number][] = [
      [0.0, 0.1, -0.05, 0.3],    // x, y, z, rotation
      [0.08, 0.1, 0.06, -0.8],
      [-0.06, 0.1, 0.04, 1.5],
    ];
    for (const [lx, ly, lz, rot] of logPositions) {
      const log = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.35, 6), charredMat,
      ));
      log.position.set(lx, ly, lz);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rot;
      group.add(log);
    }

    // ── 3. Glowing embers ──
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xFF4400,
      roughness: 0.8,
      metalness: 0.0,
      emissive: 0xFF4400,
      emissiveIntensity: 2.0,
    });
    const emberPositions: [number, number, number][] = [
      [0.0, 0.06, 0.0],
      [0.08, 0.05, -0.04],
      [-0.06, 0.06, 0.05],
      [0.04, 0.07, 0.06],
      [-0.03, 0.05, -0.06],
    ];
    for (const [ex, ey, ez] of emberPositions) {
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 6, 6), emberMat,
      );
      ember.position.set(ex, ey, ez);
      group.add(ember);
    }

    // Warm point light for the fire glow
    const fireLight = new THREE.PointLight(0xFF6622, 0.8, 6);
    fireLight.position.set(0, 0.3, 0);
    group.add(fireLight);

    // ── 4. Log benches arranged in a semi-circle ──
    const benchAngles = [-0.8, 0.0, 0.8]; // radians, semi-circle facing +Z
    const benchRadius = 1.2;
    for (const angle of benchAngles) {
      const benchGroup = new THREE.Group();

      // Main log (bench seat)
      const seatLog = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.9, 8), wood,
      ));
      seatLog.rotation.z = Math.PI / 2;
      seatLog.position.y = 0.22;
      benchGroup.add(seatLog);

      // Two short log supports underneath
      for (const side of [-0.3, 0.3]) {
        const support = shad(new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.07, 0.22, 6), dark,
        ));
        support.position.set(side, 0.11, 0);
        benchGroup.add(support);
      }

      // Position bench around the fire pit
      const bx = Math.sin(angle) * benchRadius;
      const bz = Math.cos(angle) * benchRadius;
      benchGroup.position.set(bx, 0, bz);
      benchGroup.rotation.y = -angle; // face the fire
      group.add(benchGroup);
    }

    return group;
  }


  /**
   * Creates a sloped dirt foundation (truncated rectangular pyramid) for buildings like FarmField.
   * Flat top matching building footprint, 4 sloped sides going outward/downward.
   * Includes scattered rocks and grass tufts for a natural look.
   */
  createSlopedDirtFoundation(
    topWidth: number,
    topDepth: number,
    height: number,
  ): THREE.Group {
    const group = new THREE.Group();
    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Truncated rectangular pyramid: base is wider than top by height * 1.5 on each side
    const slopeExtend = height * 3.0;
    const bottomWidth = topWidth + slopeExtend * 2;
    const bottomDepth = topDepth + slopeExtend * 2;

    const hw = topWidth / 2;
    const hd = topDepth / 2;
    const bw = bottomWidth / 2;
    const bd = bottomDepth / 2;

    // Vertices: top rectangle (y=0) then bottom rectangle (y=-height)
    const vertices = new Float32Array([
      // Top face (4 corners) - indices 0-3
      -hw, 0,  hd,   //  0: top-left-front
       hw, 0,  hd,   //  1: top-right-front
       hw, 0, -hd,   //  2: top-right-back
      -hw, 0, -hd,   //  3: top-left-back
      // Bottom face (4 corners) - indices 4-7
      -bw, -height,  bd,   //  4: bottom-left-front
       bw, -height,  bd,   //  5: bottom-right-front
       bw, -height, -bd,   //  6: bottom-right-back
      -bw, -height, -bd,   //  7: bottom-left-back
    ]);

    // Indices for all 6 faces (2 triangles each)
    const indices = [
      // Top cap
      0, 1, 2,  0, 2, 3,
      // Bottom cap
      4, 6, 5,  4, 7, 6,
      // Front face (positive Z)
      0, 5, 1,  0, 4, 5,
      // Back face (negative Z)
      2, 7, 3,  2, 6, 7,
      // Right face (positive X)
      1, 6, 2,  1, 5, 6,
      // Left face (negative X)
      3, 4, 0,  3, 7, 4,
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mound = shad(new THREE.Mesh(geometry, grassMat));
    group.add(mound);

    // Scattered small rocks partially embedded in slopes
    const stoneMat = this.mat('stone');
    const rockCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < rockCount; i++) {
      const size = 0.06 + Math.random() * 0.1;
      const rock = shad(new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        stoneMat,
      ));
      // Place on a random slope face
      const side = Math.floor(Math.random() * 4);
      const t = 0.3 + Math.random() * 0.5; // position along the slope height
      const yPos = -height * t;
      const lateralT = (Math.random() - 0.5) * 0.8;
      let rx: number, rz: number;
      const slopeT = t; // how far down the slope (0=top, 1=bottom)
      if (side === 0) { // front
        rx = lateralT * (hw + (bw - hw) * slopeT);
        rz = hd + (bd - hd) * slopeT;
      } else if (side === 1) { // back
        rx = lateralT * (hw + (bw - hw) * slopeT);
        rz = -(hd + (bd - hd) * slopeT);
      } else if (side === 2) { // right
        rx = hw + (bw - hw) * slopeT;
        rz = lateralT * (hd + (bd - hd) * slopeT);
      } else { // left
        rx = -(hw + (bw - hw) * slopeT);
        rz = lateralT * (hd + (bd - hd) * slopeT);
      }
      rock.position.set(rx, yPos, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.scale.y = 0.5 + Math.random() * 0.5;
      group.add(rock);
    }

    // Grass tufts around the base
    const leafMat = this.mat('leaf');
    const grassCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < grassCount; i++) {
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.04 + Math.random() * 0.03, 0.12 + Math.random() * 0.08, 4),
        leafMat,
      );
      // Place around the bottom perimeter
      const side = Math.floor(Math.random() * 4);
      const lateralT = (Math.random() - 0.5) * 0.9;
      let tx: number, tz: number;
      if (side === 0) { tx = lateralT * bw; tz = bd; }
      else if (side === 1) { tx = lateralT * bw; tz = -bd; }
      else if (side === 2) { tx = bw; tz = lateralT * bd; }
      else { tx = -bw; tz = lateralT * bd; }
      tuft.position.set(tx, -height + 0.05, tz);
      tuft.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3,
      );
      group.add(tuft);
    }

    return group;
  }


  /**
   * Creates a natural-looking terrain mound for campfires and similar structures on slopes.
   * Uses LatheGeometry with a smooth profile curve for a natural hill shape.
   */
  createTerrainMound(
    topRadius: number,
    bottomRadius: number,
    height: number,
  ): THREE.Group {
    const group = new THREE.Group();
    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Build smooth mound profile using LatheGeometry
    const points: THREE.Vector2[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 = bottom, 1 = top
      const smoothT = Math.pow(t, 0.35); // very gentle slope at bottom, steeper near top
      const smoothR = bottomRadius + (topRadius - bottomRadius) * smoothT;
      const y = -height * (1 - t); // from -height at bottom to 0 at top
      points.push(new THREE.Vector2(smoothR, y));
    }
    const moundGeo = new THREE.LatheGeometry(points, 16);
    const moundMat = grassMat.clone();
    moundMat.side = THREE.DoubleSide;
    const mound = shad(new THREE.Mesh(moundGeo, moundMat));
    group.add(mound);

    // Top cap (flat circle at y=0)
    const topCap = shad(new THREE.Mesh(
      new THREE.CircleGeometry(topRadius, 16),
      moundMat,
    ));
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = 0;
    group.add(topCap);

    // Bottom cap (flat circle at y=-height)
    const bottomCap = shad(new THREE.Mesh(
      new THREE.CircleGeometry(bottomRadius, 16),
      moundMat,
    ));
    bottomCap.rotation.x = -Math.PI / 2;
    bottomCap.position.y = -height;
    group.add(bottomCap);

    // Scattered stones partially embedded on the slopes
    const stoneMat = this.mat('stone');
    const stoneCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < stoneCount; i++) {
      const size = 0.06 + Math.random() * 0.1;
      const stone = shad(new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        stoneMat,
      ));
      const angle = Math.random() * Math.PI * 2;
      const dist = bottomRadius * (0.5 + Math.random() * 0.4);
      const yPos = -height * (0.3 + Math.random() * 0.5);
      stone.position.set(Math.cos(angle) * dist, yPos, Math.sin(angle) * dist);
      stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      stone.scale.y = 0.5 + Math.random() * 0.5;
      group.add(stone);
    }

    // Grass tufts around the lower rim
    const leafMat = this.mat('leaf');
    const grassCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < grassCount; i++) {
      const tuftAngle = Math.random() * Math.PI * 2;
      const tuftDist = bottomRadius * (0.85 + Math.random() * 0.2);
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.04 + Math.random() * 0.03, 0.12 + Math.random() * 0.08, 4),
        leafMat,
      );
      tuft.position.set(
        Math.cos(tuftAngle) * tuftDist,
        -height + 0.05,
        Math.sin(tuftAngle) * tuftDist,
      );
      tuft.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3,
      );
      group.add(tuft);
    }

    // Small roots/twigs on the surface
    const woodMat = this.mat('wood');
    for (let i = 0; i < 3; i++) {
      const twigAngle = Math.random() * Math.PI * 2;
      const twigDist = bottomRadius * (0.4 + Math.random() * 0.4);
      const twig = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.015, 0.15 + Math.random() * 0.1, 4),
        woodMat,
      );
      twig.position.set(
        Math.cos(twigAngle) * twigDist,
        -height * 0.5,
        Math.sin(twigAngle) * twigDist,
      );
      twig.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.PI / 2 + (Math.random() - 0.5) * 0.3);
      group.add(twig);
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
    const logMat = this.createLogWoodMaterial();
    const darkWood = this.mat('darkWood');
    const ironMetal = this.mat('ironMetal');
    const stoneMat = this.createStoneFoundationMaterial();
    const shingleMat = this.createWoodShingleMaterial();
    const chinkMat = new THREE.MeshStandardMaterial({ color: 0x6B4E32, roughness: 1.0, metalness: 0.0 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x6699BB, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.4,
    });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x3A7D2A, roughness: 0.9, metalness: 0.0 });

    // Dimensions
    const W = 2.0;   // cabin width (X)
    const D = 2.0;   // cabin depth (Z)
    const logR = 0.12; // base log radius
    const logCount = 7; // logs per wall
    const logSpacing = logR * 2 * 0.82; // tighter overlap to eliminate gaps
    const wallH = logCount * logSpacing;
    const foundH = 0.25;
    const overhang = 0.15; // log extension past corners

    // Helper: set shadow on mesh
    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ── 1. Stone Foundation ──
    const foundation = shad(new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, foundH, D + 0.2), stoneMat));
    foundation.position.y = foundH / 2;
    group.add(foundation);

    // Corner foundation stones (protruding detail)
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const cs = shad(new THREE.Mesh(new THREE.BoxGeometry(0.22, foundH + 0.04, 0.22), stoneMat));
        cs.position.set(cx * (W / 2 + 0.02), foundH / 2, cz * (D / 2 + 0.02));
        group.add(cs);
      }
    }

    // ── 2. Log Walls ──
    const walls = new THREE.Group();
    walls.name = 'walls';

    for (let i = 0; i < logCount; i++) {
      const y = foundH + logR + i * logSpacing;
      const r = logR + (Math.random() - 0.5) * 0.02; // slight variation

      // Front & back walls (along X axis)
      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, W + overhang * 2, 12), logMat));
        log.rotation.z = Math.PI / 2;
        log.position.set(0, y, side * D / 2);
        walls.add(log);
      }

      // Left & right walls (along Z axis)
      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, D + overhang * 2, 12), logMat));
        log.rotation.x = Math.PI / 2;
        log.position.set(side * W / 2, y, 0);
        walls.add(log);
      }

      // Chinking strips between logs (thin mortar lines)
      if (i > 0) {
        const cy = foundH + i * logSpacing;
        for (const side of [-1, 1]) {
          const chinkFB = shad(new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.04, 0.14), chinkMat));
          chinkFB.position.set(0, cy, side * D / 2);
          walls.add(chinkFB);
          const chinkLR = shad(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, D - 0.1), chinkMat));
          chinkLR.position.set(side * W / 2, cy, 0);
          walls.add(chinkLR);
        }
      }
    }

    // ── Solid inner wall panels (prevent all light leaks between logs) ──
    const innerWallMat = new THREE.MeshStandardMaterial({
      color: 0x5C3A1E, // dark brown matching log interior
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    const innerWallH = wallH + logR * 2; // cover full log wall height
    const innerWallY = foundH + innerWallH / 2;

    // Front & back inner walls
    for (const side of [-1, 1]) {
      const wall = shad(new THREE.Mesh(
        new THREE.BoxGeometry(W + 0.1, innerWallH, 0.12),
        innerWallMat
      ));
      wall.position.set(0, innerWallY, side * D / 2);
      walls.add(wall);
    }
    // Left & right inner walls
    for (const side of [-1, 1]) {
      const wall = shad(new THREE.Mesh(
        new THREE.BoxGeometry(0.12, innerWallH, D + 0.1),
        innerWallMat
      ));
      wall.position.set(side * W / 2, innerWallY, 0);
      walls.add(wall);
    }

    group.add(walls);

    // ── 3. Corner Posts ──
    const postH = wallH + 0.05;
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const post = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, postH, 6), darkWood));
        post.position.set(cx * W / 2, foundH + postH / 2, cz * D / 2);
        group.add(post);
      }
    }

    // ── 4. Gable Roof (ExtrudeGeometry) ──
    const roofOverhang = 0.3;
    const roofW = W / 2 + roofOverhang;
    const roofPeak = 1.0;
    const roofDepth = D + roofOverhang * 2;
    const roofBaseY = foundH + wallH;

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-roofW, 0);
    roofShape.lineTo(0, roofPeak);
    roofShape.lineTo(roofW, 0);
    roofShape.lineTo(-roofW, 0);

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
      steps: 1, depth: roofDepth, bevelEnabled: false,
    });
    const roofMesh = shad(new THREE.Mesh(roofGeo, shingleMat));
    roofMesh.position.set(0, roofBaseY, -roofDepth / 2);
    group.add(roofMesh);

    // Ridge beam along the top
    const ridgeBeam = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, roofDepth + 0.1, 6), darkWood,
    ));
    ridgeBeam.rotation.x = Math.PI / 2;
    ridgeBeam.position.set(0, roofBaseY + roofPeak, 0);
    group.add(ridgeBeam);

    // Visible rafter ends (front and back, 3 per side)
    const rafterPositions = [-0.6, 0, 0.6];
    for (const rx of rafterPositions) {
      for (const side of [-1, 1]) {
        const rafter = shad(new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 0.35, 6), darkWood,
        ));
        rafter.rotation.x = Math.PI / 2;
        rafter.position.set(rx, roofBaseY + 0.05, side * (D / 2 + roofOverhang - 0.05));
        group.add(rafter);
      }
    }

    // Gable fill triangles (front and back)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-W / 2, 0);
    gableShape.lineTo(0, roofPeak - 0.05);
    gableShape.lineTo(W / 2, 0);
    gableShape.lineTo(-W / 2, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
      steps: 1, depth: 0.08, bevelEnabled: false,
    });
    for (const side of [-1, 1]) {
      const gable = shad(new THREE.Mesh(gableGeo, logMat));
      gable.position.set(0, roofBaseY, side * (D / 2 - 0.04));
      group.add(gable);
    }

    // ── 5. Front Door ──
    const doorGroup = new THREE.Group();
    const doorW = 0.45;
    const doorH = 0.85;

    // Door frame (dark wood surround)
    const frameThick = 0.06;
    const frameLeft = shad(new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.14), darkWood));
    frameLeft.position.set(-doorW / 2 - frameThick / 2, 0, 0);
    doorGroup.add(frameLeft);
    const frameRight = shad(new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.14), darkWood));
    frameRight.position.set(doorW / 2 + frameThick / 2, 0, 0);
    doorGroup.add(frameRight);
    const frameTop = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, 0.14), darkWood));
    frameTop.position.set(0, doorH / 2 + frameThick / 2, 0);
    doorGroup.add(frameTop);

    // Door planks (3-4 vertical boards)
    const plankW = doorW / 3.5;
    for (let p = 0; p < 4; p++) {
      const px = -doorW / 2 + plankW / 2 + p * (doorW / 4);
      const plank = shad(new THREE.Mesh(new THREE.BoxGeometry(plankW - 0.01, doorH, 0.05), logMat));
      plank.position.set(px, 0, 0.02);
      doorGroup.add(plank);
    }

    // Iron strap hinges (2 horizontal bands)
    for (const hy of [0.25, -0.25]) {
      const hinge = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.8, 0.04, 0.02), ironMetal));
      hinge.position.set(-0.03, hy, 0.05);
      doorGroup.add(hinge);
    }

    // Iron ring handle (TorusGeometry)
    const ring = shad(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), ironMetal));
    ring.position.set(0.12, 0, 0.06);
    doorGroup.add(ring);

    // Ring mount plate
    const mountPlate = shad(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.015), ironMetal));
    mountPlate.position.set(0.12, 0, 0.05);
    doorGroup.add(mountPlate);



    doorGroup.position.set(0, foundH + doorH / 2 + 0.02, D / 2 + 0.06);
    group.add(doorGroup);

    // ── 6. Windows (one on each side wall) ──
    for (const side of [-1, 1]) {
      const winGroup = new THREE.Group();
      const winSize = 0.38;

      // Window frame (dark wood)
      const wfTop = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, winSize + 0.1), darkWood));
      wfTop.position.set(0, winSize / 2 + 0.025, 0);
      winGroup.add(wfTop);
      const wfBot = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, winSize + 0.1), darkWood));
      wfBot.position.set(0, -winSize / 2 - 0.025, 0);
      winGroup.add(wfBot);
      const wfL = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, winSize, 0.05), darkWood));
      wfL.position.set(0, 0, -winSize / 2 - 0.025);
      winGroup.add(wfL);
      const wfR = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, winSize, 0.05), darkWood));
      wfR.position.set(0, 0, winSize / 2 + 0.025);
      winGroup.add(wfR);

      // Cross frame (+ shape)
      const crossH = shad(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, winSize), darkWood));
      crossH.position.set(0, 0, 0);
      winGroup.add(crossH);
      const crossV = shad(new THREE.Mesh(new THREE.BoxGeometry(0.06, winSize, 0.03), darkWood));
      crossV.position.set(0, 0, 0);
      winGroup.add(crossV);

      // Glass panes (4 quadrants)
      for (const qx of [-1, 1]) {
        for (const qz of [-1, 1]) {
          const pane = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, winSize / 2 - 0.03, winSize / 2 - 0.03), glassMat,
          );
          pane.position.set(0, qx * winSize / 4, qz * winSize / 4);
          winGroup.add(pane);
        }
      }

      // Window sill
      const sill = shad(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, winSize + 0.16), darkWood));
      sill.position.set(0, -winSize / 2 - 0.07, 0);
      winGroup.add(sill);

      // Shutters (slightly angled open)
      for (const ss of [-1, 1]) {
        const shutter = shad(new THREE.Mesh(new THREE.BoxGeometry(0.03, winSize + 0.06, winSize / 2 - 0.02), darkWood));
        shutter.position.set(side * 0.04, 0, ss * (winSize / 2 + winSize / 4 + 0.01));
        shutter.rotation.y = ss * 0.25;
        winGroup.add(shutter);
      }

      winGroup.position.set(side * (W / 2 + 0.06), foundH + wallH * 0.55, 0);
      group.add(winGroup);
    }

    // ── 7. Stone Chimney ──
    const chimneyGroup = new THREE.Group();
    const chimneyW = 0.35;
    const chimneyD = 0.35;
    const chimneyH = wallH + roofPeak + 0.3;
    // Stacked irregular stone blocks
    let cy = 0;
    while (cy < chimneyH) {
      const bh = 0.15 + Math.random() * 0.1;
      const bw = chimneyW + (Math.random() - 0.5) * 0.06;
      const bd = chimneyD + (Math.random() - 0.5) * 0.06;
      const block = shad(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), stoneMat));
      block.position.set((Math.random() - 0.5) * 0.02, cy + bh / 2, (Math.random() - 0.5) * 0.02);
      chimneyGroup.add(block);
      cy += bh + 0.01;
    }
    // Dark opening at top
    const chimneyOpening = new THREE.Mesh(
      new THREE.BoxGeometry(chimneyW - 0.1, 0.08, chimneyD - 0.1),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }),
    );
    chimneyOpening.position.set(0, cy - 0.02, 0);
    chimneyGroup.add(chimneyOpening);

    chimneyGroup.position.set(-W / 2 - chimneyW / 2 + 0.05, foundH, -D / 2 + chimneyD / 2 + 0.05);
    group.add(chimneyGroup);

    // ── 8. Porch / Awning ──
    // Two support posts in front
    const porchPostH = wallH * 0.7;
    for (const px of [-0.45, 0.45]) {
      const ppost = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, porchPostH, 6), darkWood));
      ppost.position.set(px, foundH + porchPostH / 2, D / 2 + 0.4);
      group.add(ppost);
    }
    // Small awning roof over door
    const awningShape = new THREE.Shape();
    awningShape.moveTo(-0.55, 0);
    awningShape.lineTo(0, 0.25);
    awningShape.lineTo(0.55, 0);
    awningShape.lineTo(-0.55, 0);
    const awningGeo = new THREE.ExtrudeGeometry(awningShape, {
      steps: 1, depth: 0.5, bevelEnabled: false,
    });
    const awning = shad(new THREE.Mesh(awningGeo, shingleMat));
    awning.position.set(0, foundH + porchPostH, D / 2 + 0.15);
    group.add(awning);

    // ── 9. Flower Box ──
    const flowerBox = shad(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.1), darkWood));
    flowerBox.position.set(0, foundH + wallH * 0.55 - 0.28, W / 2 + 0.12);
    flowerBox.rotation.y = Math.PI / 2;
    group.add(flowerBox);
    // Small green plants in the box
    for (let fi = -0.12; fi <= 0.12; fi += 0.08) {
      const plant = shad(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), plantMat));
      plant.position.set(fi, foundH + wallH * 0.55 - 0.2, W / 2 + 0.12);
      group.add(plant);
    }

    // ── 10. Wood Pile ──
    const pileX = W / 2 + 0.35;
    const pileZ = -D / 2 + 0.3;
    const logPilePositions = [
      [0, 0.06, 0], [0.12, 0.06, 0], [-0.1, 0.06, 0.08],
      [0.05, 0.18, 0.04],
    ];
    for (const [lx, ly, lz] of logPilePositions) {
      const pileLog = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.3, 6), logMat,
      ));
      pileLog.rotation.x = Math.PI / 2;
      pileLog.position.set(pileX + lx, ly, pileZ + lz);
      group.add(pileLog);
    }

    return group;
  }

  private createStorageBarn(): THREE.Group {
    const group = new THREE.Group();
    const logMat = this.createLogWoodMaterial();
    const darkWood = this.mat('darkWood');
    const ironMetal = this.mat('ironMetal');
    const stoneMat = this.createStoneFoundationMaterial();
    const shingleMat = this.createWoodShingleMaterial();
    const chinkMat = new THREE.MeshStandardMaterial({ color: 0x6B4E32, roughness: 1.0, metalness: 0.0 });

    // Dimensions (larger than house for barn)
    const W = 3.0;
    const D = 2.5;
    const logR = 0.14;
    const logCount = 5;
    const logSpacing = logR * 2 * 0.82;
    const wallH = logCount * logSpacing;
    const foundH = 0.35;
    const overhang = 0.18;

    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // 1. Stone Foundation
    const foundation = shad(new THREE.Mesh(new THREE.BoxGeometry(W + 0.25, foundH, D + 0.25), stoneMat));
    foundation.position.y = foundH / 2;
    group.add(foundation);

    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const cs = shad(new THREE.Mesh(new THREE.BoxGeometry(0.28, foundH + 0.05, 0.28), stoneMat));
        cs.position.set(cx * (W / 2 + 0.03), foundH / 2, cz * (D / 2 + 0.03));
        group.add(cs);
      }
    }

    // 2. Log Walls
    const walls = new THREE.Group();
    walls.name = 'walls';

    for (let i = 0; i < logCount; i++) {
      const y = foundH + logR + i * logSpacing;
      const r = logR + (Math.random() - 0.5) * 0.02;

      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, W + overhang * 2, 12), logMat));
        log.rotation.z = Math.PI / 2;
        log.position.set(0, y, side * D / 2);
        walls.add(log);
      }

      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, D + overhang * 2, 12), logMat));
        log.rotation.x = Math.PI / 2;
        log.position.set(side * W / 2, y, 0);
        walls.add(log);
      }

      if (i > 0) {
        const cy = foundH + i * logSpacing;
        for (const side of [-1, 1]) {
          const chinkFB = shad(new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.05, 0.16), chinkMat));
          chinkFB.position.set(0, cy, side * D / 2);
          walls.add(chinkFB);
          const chinkLR = shad(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, D - 0.15), chinkMat));
          chinkLR.position.set(side * W / 2, cy, 0);
          walls.add(chinkLR);
        }
      }
    }

    const innerWallMat = new THREE.MeshStandardMaterial({
      color: 0x5C3A1E,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    const innerWallH = wallH + logR * 2;
    const innerWallY = foundH + innerWallH / 2;

    for (const side of [-1, 1]) {
      const wall = shad(new THREE.Mesh(
        new THREE.BoxGeometry(W + 0.12, innerWallH, 0.14),
        innerWallMat
      ));
      wall.position.set(0, innerWallY, side * D / 2);
      walls.add(wall);
    }
    for (const side of [-1, 1]) {
      const wall = shad(new THREE.Mesh(
        new THREE.BoxGeometry(0.14, innerWallH, D + 0.12),
        innerWallMat
      ));
      wall.position.set(side * W / 2, innerWallY, 0);
      walls.add(wall);
    }

    group.add(walls);

    // 3. Corner Posts
    const postH = wallH + 0.08;
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const post = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, postH, 6), darkWood));
        post.position.set(cx * W / 2, foundH + postH / 2, cz * D / 2);
        group.add(post);
      }
    }

    // 4. Gable Roof
    const roofOverhang = 0.35;
    const roofW = W / 2 + roofOverhang;
    const roofPeak = 1.2;
    const roofDepth = D + roofOverhang * 2;
    const roofBaseY = foundH + wallH;

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-roofW, 0);
    roofShape.lineTo(0, roofPeak);
    roofShape.lineTo(roofW, 0);
    roofShape.lineTo(-roofW, 0);

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
      steps: 1, depth: roofDepth, bevelEnabled: false,
    });
    const roofMesh = shad(new THREE.Mesh(roofGeo, shingleMat));
    roofMesh.position.set(0, roofBaseY, -roofDepth / 2);
    group.add(roofMesh);

    const ridgeBeam = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, roofDepth + 0.12, 6), darkWood,
    ));
    ridgeBeam.rotation.x = Math.PI / 2;
    ridgeBeam.position.set(0, roofBaseY + roofPeak, 0);
    group.add(ridgeBeam);

    const rafterPositions = [-0.8, 0, 0.8];
    for (const rx of rafterPositions) {
      for (const side of [-1, 1]) {
        const rafter = shad(new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), darkWood,
        ));
        rafter.rotation.x = Math.PI / 2;
        rafter.position.set(rx, roofBaseY + 0.08, side * (D / 2 + roofOverhang - 0.06));
        group.add(rafter);
      }
    }

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-W / 2, 0);
    gableShape.lineTo(0, roofPeak - 0.06);
    gableShape.lineTo(W / 2, 0);
    gableShape.lineTo(-W / 2, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
      steps: 1, depth: 0.1, bevelEnabled: false,
    });
    for (const side of [-1, 1]) {
      const gable = shad(new THREE.Mesh(gableGeo, logMat));
      gable.position.set(0, roofBaseY, side * (D / 2 - 0.05));
      group.add(gable);
    }

    // 5. Large Barn Doors
    const doorGroup = new THREE.Group();
    const doorW = 1.2;
    const doorH = 1.4;

    const frameThick = 0.08;
    const frameLeft = shad(new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.16), darkWood));
    frameLeft.position.set(-doorW - frameThick / 2, 0, 0);
    doorGroup.add(frameLeft);
    const frameRight = shad(new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.16), darkWood));
    frameRight.position.set(doorW + frameThick / 2, 0, 0);
    doorGroup.add(frameRight);
    const frameTop = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW + frameThick * 2 + 0.1, frameThick, 0.16), darkWood));
    frameTop.position.set(-0.05, doorH / 2 + frameThick / 2, 0);
    doorGroup.add(frameTop);

    const leftDoorGroup = new THREE.Group();
    const plankW = doorW / 2 / 3.5;
    for (let p = 0; p < 4; p++) {
      const px = -doorW / 2 + plankW / 2 + p * (doorW / 8);
      const plank = shad(new THREE.Mesh(new THREE.BoxGeometry(plankW - 0.015, doorH, 0.06), logMat));
      plank.position.set(px, 0, 0.02);
      leftDoorGroup.add(plank);
    }

    for (const hy of [0.45, 0, -0.45]) {
      const hinge = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, 0.05, 0.025), ironMetal));
      hinge.position.set(-0.05, hy, 0.06);
      leftDoorGroup.add(hinge);
    }

    // X-brace diagonals on left door half
    const braceW = doorW / 2 - 0.06;
    const braceH = doorH - 0.1;
    const braceLen = Math.sqrt(braceW * braceW + braceH * braceH);
    const braceAngle = Math.atan2(braceH, braceW);
    for (const dir of [1, -1]) {
      const brace = shad(new THREE.Mesh(new THREE.BoxGeometry(braceLen, 0.04, 0.03), darkWood));
      brace.rotation.z = dir * braceAngle;
      brace.position.set(-doorW / 4, 0, 0.04);
      leftDoorGroup.add(brace);
    }

    doorGroup.add(leftDoorGroup);

    const rightDoorGroup = new THREE.Group();
    for (let p = 0; p < 4; p++) {
      const px = -doorW / 2 + plankW / 2 + p * (doorW / 8);
      const plank = shad(new THREE.Mesh(new THREE.BoxGeometry(plankW - 0.015, doorH, 0.06), logMat));
      plank.position.set(px, 0, 0.02);
      rightDoorGroup.add(plank);
    }

    for (const hy of [0.45, 0, -0.45]) {
      const hinge = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, 0.05, 0.025), ironMetal));
      hinge.position.set(0.05, hy, 0.06);
      rightDoorGroup.add(hinge);
    }

    // X-brace diagonals on right door half
    for (const dir of [1, -1]) {
      const brace = shad(new THREE.Mesh(new THREE.BoxGeometry(braceLen, 0.04, 0.03), darkWood));
      brace.rotation.z = dir * braceAngle;
      brace.position.set(doorW / 4, 0, 0.04);
      rightDoorGroup.add(brace);
    }

    doorGroup.add(rightDoorGroup);

    const handlePlate = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.02), ironMetal));
    handlePlate.position.set(0, 0.1, 0.08);
    doorGroup.add(handlePlate);

    const handleBar = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), ironMetal));
    handleBar.rotation.x = Math.PI / 2;
    handleBar.position.set(0, 0.1, 0.1);
    doorGroup.add(handleBar);



    doorGroup.position.set(0, foundH + doorH / 2 + 0.02, D / 2 + 0.08);
    group.add(doorGroup);

    // 6. Hay Loft Window
    const loftWindowGroup = new THREE.Group();
    const loftWinSize = 0.45;

    const lwfTop = shad(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, loftWinSize + 0.12), darkWood));
    lwfTop.position.set(0, loftWinSize / 2 + 0.03, 0);
    loftWindowGroup.add(lwfTop);
    const lwfBot = shad(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, loftWinSize + 0.12), darkWood));
    lwfBot.position.set(0, -loftWinSize / 2 - 0.03, 0);
    loftWindowGroup.add(lwfBot);
    const lwfL = shad(new THREE.Mesh(new THREE.BoxGeometry(0.12, loftWinSize, 0.06), darkWood));
    lwfL.position.set(0, 0, -loftWinSize / 2 - 0.03);
    loftWindowGroup.add(lwfL);
    const lwfR = shad(new THREE.Mesh(new THREE.BoxGeometry(0.12, loftWinSize, 0.06), darkWood));
    lwfR.position.set(0, 0, loftWinSize / 2 + 0.03);
    loftWindowGroup.add(lwfR);

    const lcrossH = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, loftWinSize), darkWood));
    lcrossH.position.set(0, 0, 0);
    loftWindowGroup.add(lcrossH);
    const lcrossV = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, loftWinSize, 0.035), darkWood));
    lcrossV.position.set(0, 0, 0);
    loftWindowGroup.add(lcrossV);

    const loftWinInterior = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, loftWinSize - 0.08, loftWinSize - 0.08),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }),
    );
    loftWinInterior.position.set(0, 0, 0);
    loftWindowGroup.add(loftWinInterior);

    const loftSill = shad(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, loftWinSize + 0.18), darkWood));
    loftSill.position.set(0, -loftWinSize / 2 - 0.08, 0);
    loftWindowGroup.add(loftSill);

    loftWindowGroup.position.set(0, foundH + wallH + roofPeak * 0.4, -D / 2 - 0.08);
    group.add(loftWindowGroup);

    // 7. Exterior Props: Barrels
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6B4423, roughness: 0.85, metalness: 0.0 });
    const barrelPositions: [number, number, number][] = [
      [-W / 2 - 0.15, 0.25, D / 2 - 0.3],
      [-W / 2 - 0.15, 0.25, D / 2 - 0.7],
    ];
    for (const [bx, by, bz] of barrelPositions) {
      const barrel = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.5, 12), barrelMat));
      barrel.position.set(bx, by, bz);
      group.add(barrel);
      for (const bandY of [0.15, -0.15]) {
        const band = shad(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.015, 6, 12), ironMetal));
        band.rotation.x = Math.PI / 2;
        band.position.set(bx, by + bandY, bz);
        group.add(band);
      }
    }

    // 8. Exterior Props: Crates
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9, metalness: 0.0 });
    const cratePositions: [number, number, number][] = [
      [W / 2 + 0.1, 0.2, D / 2 - 0.2],
      [W / 2 + 0.35, 0.2, D / 2 - 0.2],
      [W / 2 + 0.1, 0.2, D / 2 - 0.55],
    ];
    for (const [cx, cy, cz] of cratePositions) {
      const crate = shad(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), crateMat));
      crate.position.set(cx, cy, cz);
      group.add(crate);
      for (let pl = 0; pl < 3; pl++) {
        const plankLine = shad(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.01), darkWood));
        plankLine.position.set(cx, cy - 0.15 + pl * 0.15, cz + 0.21);
        group.add(plankLine);
      }
    }

    // 9. Exterior Props: Timber Pile
    const pileX = -W / 2 - 0.4;
    const pileZ = -D / 2 + 0.3;
    const timberPilePositions = [
      [0, 0.07, 0], [0.14, 0.07, 0], [-0.12, 0.07, 0.1],
      [0.07, 0.21, 0.05], [-0.05, 0.21, 0.12],
    ];
    for (const [lx, ly, lz] of timberPilePositions) {
      const pileLog = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.4, 6), logMat,
      ));
      pileLog.rotation.x = Math.PI / 2;
      pileLog.position.set(pileX + lx, ly, pileZ + lz);
      group.add(pileLog);
    }

    return group;
  }

  private createWoodcutterHut(): THREE.Group {
    const group = new THREE.Group();
    const logMat = this.createLogWoodMaterial();
    const darkWood = this.mat('darkWood');
    const ironMetal = this.mat('ironMetal');
    const stoneMat = this.createStoneFoundationMaterial();
    const shingleMat = this.createWoodShingleMaterial();
    const chinkMat = new THREE.MeshStandardMaterial({ color: 0x6B4E32, roughness: 1.0, metalness: 0.0 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x6699BB, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.4,
    });

    const W = 1.6;
    const D = 1.6;
    const logR = 0.1;
    const logCount = 5;
    const logSpacing = logR * 2 * 0.82;
    const wallH = logCount * logSpacing;
    const foundH = 0.2;
    const overhang = 0.12;

    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // Stone Foundation
    const foundation = shad(new THREE.Mesh(new THREE.BoxGeometry(W + 0.15, foundH, D + 0.15), stoneMat));
    foundation.position.y = foundH / 2;
    group.add(foundation);

    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const cs = shad(new THREE.Mesh(new THREE.BoxGeometry(0.18, foundH + 0.03, 0.18), stoneMat));
        cs.position.set(cx * (W / 2 + 0.01), foundH / 2, cz * (D / 2 + 0.01));
        group.add(cs);
      }
    }

    // Log Walls
    const walls = new THREE.Group();
    for (let i = 0; i < logCount; i++) {
      const y = foundH + logR + i * logSpacing;
      const r = logR + (Math.random() - 0.5) * 0.015;

      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, W + overhang * 2, 10), logMat));
        log.rotation.z = Math.PI / 2;
        log.position.set(0, y, side * D / 2);
        walls.add(log);
      }

      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, D + overhang * 2, 10), logMat));
        log.rotation.x = Math.PI / 2;
        log.position.set(side * W / 2, y, 0);
        walls.add(log);
      }

      if (i > 0) {
        const cy = foundH + i * logSpacing;
        for (const side of [-1, 1]) {
          const chinkFB = shad(new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.03, 0.1), chinkMat));
          chinkFB.position.set(0, cy, side * D / 2);
          walls.add(chinkFB);
          const chinkLR = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, D - 0.08), chinkMat));
          chinkLR.position.set(side * W / 2, cy, 0);
          walls.add(chinkLR);
        }
      }
    }

    const innerWallMat = new THREE.MeshStandardMaterial({
      color: 0x5C3A1E, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide
    });
    const innerWallH = wallH + logR * 2;
    const innerWallY = foundH + innerWallH / 2;

    for (const side of [-1, 1]) {
      const wall = shad(new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, innerWallH, 0.1), innerWallMat));
      wall.position.set(0, innerWallY, side * D / 2);
      walls.add(wall);
    }
    for (const side of [-1, 1]) {
      const wall = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, innerWallH, D + 0.08), innerWallMat));
      wall.position.set(side * W / 2, innerWallY, 0);
      walls.add(wall);
    }

    group.add(walls);

    // Corner Posts
    const postH = wallH + 0.04;
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const post = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, postH, 6), darkWood));
        post.position.set(cx * W / 2, foundH + postH / 2, cz * D / 2);
        group.add(post);
      }
    }

    // Pitched Roof with shingles
    const roofOverhang = 0.25;
    const roofW = W / 2 + roofOverhang;
    const roofPeak = 0.7;
    const roofDepth = D + roofOverhang * 2;
    const roofBaseY = foundH + wallH;

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-roofW, 0);
    roofShape.lineTo(0, roofPeak);
    roofShape.lineTo(roofW, 0);
    roofShape.lineTo(-roofW, 0);

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { steps: 1, depth: roofDepth, bevelEnabled: false });
    const roofMesh = shad(new THREE.Mesh(roofGeo, shingleMat));
    roofMesh.position.set(0, roofBaseY, -roofDepth / 2);
    group.add(roofMesh);

    const ridgeBeam = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, roofDepth + 0.08, 6), darkWood,
    ));
    ridgeBeam.rotation.x = Math.PI / 2;
    ridgeBeam.position.set(0, roofBaseY + roofPeak, 0);
    group.add(ridgeBeam);

    // Rafter ends
    const rafterPositions = [-0.5, 0, 0.5];
    for (const rx of rafterPositions) {
      for (const side of [-1, 1]) {
        const rafter = shad(new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), darkWood,
        ));
        rafter.rotation.x = Math.PI / 2;
        rafter.position.set(rx, roofBaseY + 0.04, side * (D / 2 + roofOverhang - 0.04));
        group.add(rafter);
      }
    }

    // Gable fill
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-W / 2, 0);
    gableShape.lineTo(0, roofPeak - 0.04);
    gableShape.lineTo(W / 2, 0);
    gableShape.lineTo(-W / 2, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { steps: 1, depth: 0.06, bevelEnabled: false });
    for (const side of [-1, 1]) {
      const gable = shad(new THREE.Mesh(gableGeo, logMat));
      gable.position.set(0, roofBaseY, side * (D / 2 - 0.03));
      group.add(gable);
    }

    // Door
    const doorGroup = new THREE.Group();
    const doorW = 0.38;
    const doorH = 0.7;

    const frameThick = 0.05;
    const frameLeft = shad(new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.12), darkWood));
    frameLeft.position.set(-doorW / 2 - frameThick / 2, 0, 0);
    doorGroup.add(frameLeft);
    const frameRight = shad(new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.12), darkWood));
    frameRight.position.set(doorW / 2 + frameThick / 2, 0, 0);
    doorGroup.add(frameRight);
    const frameTop = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, 0.12), darkWood));
    frameTop.position.set(0, doorH / 2 + frameThick / 2, 0);
    doorGroup.add(frameTop);

    const plankW = doorW / 3.5;
    for (let p = 0; p < 3; p++) {
      const px = -doorW / 2 + plankW / 2 + p * (doorW / 3);
      const plank = shad(new THREE.Mesh(new THREE.BoxGeometry(plankW - 0.01, doorH, 0.04), logMat));
      plank.position.set(px, 0, 0.02);
      doorGroup.add(plank);
    }

    const hinge = shad(new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, 0.035, 0.018), ironMetal));
    hinge.position.set(-0.02, 0.15, 0.04);
    doorGroup.add(hinge);



    doorGroup.position.set(0, foundH + doorH / 2 + 0.015, D / 2 + 0.05);
    group.add(doorGroup);

    // Small Window with shutters
    const winGroup = new THREE.Group();
    const winSize = 0.28;

    const wfTop = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, winSize + 0.08), darkWood));
    wfTop.position.set(0, winSize / 2 + 0.02, 0);
    winGroup.add(wfTop);
    const wfBot = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, winSize + 0.08), darkWood));
    wfBot.position.set(0, -winSize / 2 - 0.02, 0);
    winGroup.add(wfBot);
    const wfL = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, winSize, 0.04), darkWood));
    wfL.position.set(0, 0, -winSize / 2 - 0.02);
    winGroup.add(wfL);
    const wfR = shad(new THREE.Mesh(new THREE.BoxGeometry(0.08, winSize, 0.04), darkWood));
    wfR.position.set(0, 0, winSize / 2 + 0.02);
    winGroup.add(wfR);

    const crossH = shad(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, winSize), darkWood));
    crossH.position.set(0, 0, 0);
    winGroup.add(crossH);
    const crossV = shad(new THREE.Mesh(new THREE.BoxGeometry(0.05, winSize, 0.025), darkWood));
    crossV.position.set(0, 0, 0);
    winGroup.add(crossV);

    for (const qx of [-1, 1]) {
      for (const qz of [-1, 1]) {
        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, winSize / 2 - 0.025, winSize / 2 - 0.025), glassMat,
        );
        pane.position.set(0, qx * winSize / 4, qz * winSize / 4);
        winGroup.add(pane);
      }
    }

    const sill = shad(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, winSize + 0.12), darkWood));
    sill.position.set(0, -winSize / 2 - 0.055, 0);
    winGroup.add(sill);

    for (const ss of [-1, 1]) {
      const shutter = shad(new THREE.Mesh(new THREE.BoxGeometry(0.025, winSize + 0.04, winSize / 2 - 0.015), darkWood));
      shutter.position.set(-0.9, 0, ss * (winSize / 2 + winSize / 4 + 0.008));
      shutter.rotation.y = ss * 0.2;
      winGroup.add(shutter);
    }

    winGroup.position.set(W / 2 + 0.05, foundH + wallH * 0.55, 0);
    group.add(winGroup);

    // Tool Storage - Axe visible on wall
    const axeGroup = new THREE.Group();
    const axeHandle = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.45, 6), darkWood));
    axeHandle.position.set(0, 0, 0);
    axeGroup.add(axeHandle);
    const axeHead = shad(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.025), ironMetal));
    axeHead.position.set(0.08, 0.12, 0);
    axeGroup.add(axeHead);
    axeGroup.position.set(-W / 2 - 0.08, foundH + wallH * 0.4, 0.3);
    axeGroup.rotation.z = Math.PI / 8;
    group.add(axeGroup);

    // Second axe
    const axe2Group = new THREE.Group();
    const axeHandle2 = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.4, 6), darkWood));
    axe2Group.add(axeHandle2);
    const axeHead2 = shad(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.022), ironMetal));
    axeHead2.position.set(0.07, 0.1, 0);
    axe2Group.add(axeHead2);
    axe2Group.position.set(-W / 2 - 0.08, foundH + wallH * 0.4, -0.2);
    axe2Group.rotation.z = -Math.PI / 10;
    group.add(axe2Group);

    // Small saw leaning against wall
    const sawGroup = new THREE.Group();
    const sawBlade = shad(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.12), ironMetal));
    sawBlade.position.set(0, 0.15, 0);
    sawGroup.add(sawBlade);
    const sawHandle = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), darkWood));
    sawHandle.rotation.x = Math.PI / 2;
    sawHandle.position.set(0.02, -0.02, 0);
    sawGroup.add(sawHandle);
    sawGroup.position.set(-W / 2 - 0.05, foundH + 0.15, 0.5);
    sawGroup.rotation.y = Math.PI / 6;
    group.add(sawGroup);

    // Stacked Log Pile outside
    const pileX = W / 2 + 0.4;
    const pileZ = D / 2 - 0.2;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const log = shad(new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.5, 6), logMat,
        ));
        log.rotation.x = Math.PI / 2;
        log.position.set(pileX + col * 0.12, 0.06 + row * 0.12, pileZ + row * 0.06);
        group.add(log);
      }
    }

    // Split Firewood Pile
    const fireX = -W / 2 - 0.45;
    const fireZ = D / 2 - 0.15;
    for (let i = 0; i < 4; i++) {
      const firewood = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 0.35, 6), darkWood,
      ));
      firewood.rotation.x = Math.PI / 2;
      firewood.rotation.z = (Math.random() - 0.5) * 0.2;
      firewood.position.set(fireX + (Math.random() - 0.5) * 0.08, 0.05 + (i % 2) * 0.07, fireZ + i * 0.04);
      group.add(firewood);
    }

    // Canopy roof over tool area
    const canopyOverhang = 0.2;
    const canopyW = 0.6;
    const canopyShape = new THREE.Shape();
    canopyShape.moveTo(-canopyW / 2 - canopyOverhang, 0);
    canopyShape.lineTo(0, 0.18);
    canopyShape.lineTo(canopyW / 2 + canopyOverhang, 0);
    canopyShape.lineTo(-canopyW / 2 - canopyOverhang, 0);
    const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, { steps: 1, depth: 0.5, bevelEnabled: false });
    const canopy = shad(new THREE.Mesh(canopyGeo, shingleMat));
    canopy.position.set(-W / 2 - 0.1, foundH + wallH * 0.75, 0.1);
    canopy.rotation.y = Math.PI / 2;
    group.add(canopy);

    // Canopy support posts
    for (const pz of [-0.1, 0.35]) {
      const cpost = shad(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, wallH * 0.3, 6), darkWood));
      cpost.position.set(-W / 2 - 0.1, foundH + wallH * 0.6, pz);
      group.add(cpost);
    }

    // Tree Stumps (2-3 around the hut)
    const stumpPositions: [number, number, number][] = [
      [W / 2 + 0.5, 0, -D / 2 - 0.3],
      [-W / 2 - 0.6, 0, -D / 2 - 0.2],
      [0, 0, -D / 2 - 0.5],
    ];
    for (const [sx, sy, sz] of stumpPositions) {
      const stumpHeight = 0.15 + Math.random() * 0.1;
      const stump = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, stumpHeight, 8), logMat,
      ));
      stump.position.set(sx, sy + stumpHeight / 2, sz);
      group.add(stump);
      const stumpTop = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.08, 0.02, 8), darkWood,
      ));
      stumpTop.position.set(sx, sy + stumpHeight, sz);
      group.add(stumpTop);
    }

    // Axe stuck in one stump (the first one)
    const stuckAxeGroup = new THREE.Group();
    const stuckAxeHandle = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.02, 0.4, 6), darkWood,
    ));
    stuckAxeHandle.rotation.x = Math.PI / 8;
    stuckAxeGroup.add(stuckAxeHandle);
    const stuckAxeHead = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.055, 0.022), ironMetal,
    ));
    stuckAxeHead.position.set(0.07, 0.08, 0);
    stuckAxeGroup.add(stuckAxeHead);
    stuckAxeGroup.position.set(stumpPositions[0][0] + 0.05, stumpPositions[0][1] + 0.18, stumpPositions[0][2] + 0.08);
    stuckAxeGroup.rotation.z = Math.PI / 6;
    group.add(stuckAxeGroup);

    // Chopping block (horizontal log section)
    const choppingBlock = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.15, 8), logMat,
    ));
    choppingBlock.rotation.x = Math.PI / 2;
    choppingBlock.position.set(W / 2 + 0.55, 0.06, D / 2 - 0.55);
    group.add(choppingBlock);
    const choppingBlockTop = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.1, 0.02, 8), darkWood,
    ));
    choppingBlockTop.rotation.x = Math.PI / 2;
    choppingBlockTop.position.set(W / 2 + 0.55, 0.14, D / 2 - 0.55);
    group.add(choppingBlockTop);

    // Additional scattered logs around the hut
    const scatteredLogPositions: [number, number, number, number][] = [
      [-W / 2 - 0.5, 0.04, 0.3, Math.PI / 2 + 0.15],
      [-W / 2 - 0.6, 0.035, -0.5, Math.PI / 2 - 0.1],
      [W / 2 + 0.3, 0.03, -D / 2 - 0.4, Math.PI / 2 + 0.2],
      [0.3, 0.025, -D / 2 - 0.35, Math.PI / 2 - 0.25],
    ];
    for (const [lx, ly, lz, rot] of scatteredLogPositions) {
      const log = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 0.35, 6), logMat,
      ));
      log.rotation.x = rot;
      log.rotation.z = (Math.random() - 0.5) * 0.1;
      log.position.set(lx, ly, lz);
      group.add(log);
    }

    // Small log pile near the back
    const extraPileX = -W / 2 - 0.35;
    const extraPileZ = -D / 2 + 0.4;
    const extraPilePositions = [
      [0, 0.04, 0], [0.08, 0.04, 0.05], [-0.05, 0.04, -0.04],
    ];
    for (const [lx, ly, lz] of extraPilePositions) {
      const pileLog = shad(new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.055, 0.32, 6), logMat,
      ));
      pileLog.rotation.x = Math.PI / 2;
      pileLog.rotation.z = (Math.random() - 0.5) * 0.15;
      pileLog.position.set(extraPileX + lx, ly, extraPileZ + lz);
      group.add(pileLog);
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
        const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2), leaf);
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
    const wood = this.mat('wood');
    const darkWood = this.mat('darkWood');
    const ironMetal = this.mat('ironMetal');

    const shad = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // === 1. Excavated pit with stepped stone walls ===
    const pitFloor = shad(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 3.2), dirt));
    pitFloor.position.y = -0.15;
    group.add(pitFloor);

    const wallTiers = [
      { y: 0.15, h: 0.5, w: 0.35, indent: 0 },
      { y: -0.15, h: 0.5, w: 0.35, indent: 0.15 },
      { y: -0.45, h: 0.4, w: 0.35, indent: 0.3 },
    ];

    const wallPositions: [number, number, number, number, number][] = [
      [0, 0, -1.35, 3, 0.35],
      [0, 0, 1.35, 3, 0.35],
      [-1.35, 0, 0, 0.35, 2.7],
      [1.35, 0, 0, 0.35, 2.7],
    ];

    for (const tier of wallTiers) {
      for (const [x, y, z, w, d] of wallPositions) {
        const wall = shad(new THREE.Mesh(
          new THREE.BoxGeometry(w - (tier.indent * 2), tier.h, d - (tier.indent * 2)),
          stone
        ));
        wall.position.set(x, tier.y, z);
        group.add(wall);
      }
    }

    // === 2. Broken stone debris scattered inside ===
    for (let i = 0; i < 12; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const chunk = shad(new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        stone,
      ));
      chunk.position.set(
        (Math.random() - 0.5) * 2.2,
        -0.05 + size / 2,
        (Math.random() - 0.5) * 2.2,
      );
      chunk.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      group.add(chunk);
    }

    // === 3. Pickaxes and tools against walls ===
    const pickGroup1 = new THREE.Group();
    const pickHandle1 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6),
      wood
    ));
    pickHandle1.rotation.z = 0.2;
    pickHandle1.position.y = 0.35;
    pickGroup1.add(pickHandle1);
    const pickHead1 = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.06),
      ironMetal
    ));
    pickHead1.position.set(0.1, 0.72, 0);
    pickHead1.rotation.z = 0.2;
    pickGroup1.add(pickHead1);
    pickGroup1.position.set(-0.8, -0.05, -1.15);
    pickGroup1.rotation.z = -0.4;
    group.add(pickGroup1);

    const pickGroup2 = new THREE.Group();
    const pickHandle2 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6),
      wood
    ));
    pickHandle2.rotation.x = 0.15;
    pickHandle2.position.y = 0.32;
    pickGroup2.add(pickHandle2);
    const pickHead2 = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.07, 0.05),
      ironMetal
    ));
    pickHead2.position.set(0, 0.68, 0.08);
    pickHead2.rotation.x = 0.15;
    pickGroup2.add(pickHead2);
    pickGroup2.position.set(-1.1, -0.05, 0.5);
    pickGroup2.rotation.x = -0.3;
    group.add(pickGroup2);

    // === 4. Wooden support beams ===
    const beam1 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 1.2, 6),
      darkWood
    ));
    beam1.position.set(-1.2, 0.5, -1.2);
    group.add(beam1);

    const crossBeam1 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6),
      darkWood
    ));
    crossBeam1.rotation.z = Math.PI / 2;
    crossBeam1.position.set(-0.75, 1.05, -1.2);
    group.add(crossBeam1);

    const beam2 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6),
      darkWood
    ));
    beam2.position.set(1.2, 0.4, -1.2);
    group.add(beam2);

    const supportPlank = shad(new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.08, 0.15),
      darkWood
    ));
    supportPlank.position.set(0, 0.85, -1.15);
    supportPlank.rotation.y = 0.1;
    group.add(supportPlank);

    // === 5. Stone cart / wheelbarrow ===
    const cartGroup = new THREE.Group();
    const cartBed = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.12, 0.45),
      darkWood
    ));
    cartBed.position.y = 0.25;
    cartGroup.add(cartBed);
    const cartSide1 = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.04),
      darkWood
    ));
    cartSide1.position.set(0, 0.37, 0.2);
    cartGroup.add(cartSide1);
    const cartSide2 = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.04),
      darkWood
    ));
    cartSide2.position.set(0, 0.37, -0.2);
    cartGroup.add(cartSide2);
    const cartEnd1 = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.45),
      darkWood
    ));
    cartEnd1.position.set(-0.33, 0.37, 0);
    cartGroup.add(cartEnd1);
    const cartEnd2 = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.45),
      darkWood
    ));
    cartEnd2.position.set(0.33, 0.37, 0);
    cartGroup.add(cartEnd2);
    const wheel1 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12),
      darkWood
    ));
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(-0.25, 0.1, 0.28);
    cartGroup.add(wheel1);
    const wheel2 = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12),
      darkWood
    ));
    wheel2.rotation.z = Math.PI / 2;
    wheel2.position.set(0.25, 0.1, 0.28);
    cartGroup.add(wheel2);
    const cartHandle = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6),
      darkWood
    ));
    cartHandle.rotation.z = Math.PI / 2 + 0.2;
    cartHandle.position.set(0.5, 0.25, -0.18);
    cartGroup.add(cartHandle);
    for (let i = 0; i < 4; i++) {
      const loadStone = shad(new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.04, 0),
        stone
      ));
      loadStone.position.set(
        (Math.random() - 0.5) * 0.4,
        0.45 + i * 0.08,
        (Math.random() - 0.5) * 0.25
      );
      cartGroup.add(loadStone);
    }
    cartGroup.position.set(0.7, -0.05, 0.9);
    cartGroup.rotation.y = -0.3;
    group.add(cartGroup);

    // === 6. Pile of broken stone blocks ===
    const stonePile: [number, number, number, number, number, number][] = [
      [0.9, 0.08, -0.8, 0.2, 0.15, 0.15],
      [1.0, 0.06, -0.7, 0.18, 0.12, 0.18],
      [0.85, 0.1, -0.9, 0.22, 0.18, 0.12],
      [0.95, 0.04, -0.85, 0.15, 0.08, 0.15],
      [1.05, 0.12, -0.75, 0.2, 0.1, 0.2],
      [0.88, 0.16, -0.82, 0.18, 0.14, 0.16],
    ];
    for (const [px, py, pz, sx, sy, sz] of stonePile) {
      const block = shad(new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        stone
      ));
      block.position.set(px, py, pz);
      block.rotation.y = Math.random() * 0.3;
      group.add(block);
    }

    // === 7. Mining lantern on pole ===
    const lanternGroup = new THREE.Group();
    const lanternPole = shad(new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.4, 6),
      darkWood
    ));
    lanternPole.position.y = 0.6;
    lanternGroup.add(lanternPole);
    const lanternCage = shad(new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.2, 0.15),
      ironMetal
    ));
    lanternCage.position.y = 1.35;
    lanternGroup.add(lanternCage);
    const lanternTop = shad(new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.1, 4),
      ironMetal
    ));
    lanternTop.position.y = 1.52;
    lanternTop.rotation.y = Math.PI / 4;
    lanternGroup.add(lanternTop);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xFFAA44,
      emissive: 0xFFAA44,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const lanternGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.1),
      glowMat
    );
    lanternGlow.position.y = 1.35;
    lanternGroup.add(lanternGlow);
    const lanternLight = new THREE.PointLight(0xFFAA44, 0.5, 3);
    lanternLight.position.y = 1.35;
    lanternGroup.add(lanternLight);
    lanternGroup.position.set(-1.0, -0.05, 1.0);
    group.add(lanternGroup);

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

  private createLogWoodMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base warm brown fill
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, 512, 512);

    // Broad colour variation bands (simulate heartwood / sapwood)
    for (let y = 0; y < 512; y += 1) {
      const t = y / 512;
      const r = Math.floor(139 + Math.sin(t * 12 + 1.3) * 18 + Math.sin(t * 37) * 8);
      const g = Math.floor(105 + Math.sin(t * 12 + 1.3) * 14 + Math.sin(t * 37) * 6);
      const b = Math.floor(20 + Math.sin(t * 12 + 1.3) * 8 + Math.sin(t * 37) * 4);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, 512, 1);
    }

    // Fine grain lines running horizontally (along the log length)
    for (let i = 0; i < 220; i++) {
      const y = Math.random() * 512;
      const len = 80 + Math.random() * 400;
      const x = Math.random() * (512 - len);
      const thickness = 0.5 + Math.random() * 1.5;
      const dark = Math.random() > 0.5;
      const alpha = 0.08 + Math.random() * 0.18;
      ctx.strokeStyle = dark
        ? `rgba(50, 30, 5, ${alpha})`
        : `rgba(170, 130, 50, ${alpha})`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      // Slight waviness
      const wave = Math.random() * 3;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.5, y + wave, x + len, y - wave * 0.5);
      ctx.stroke();
    }

    // Medium grain streaks (darker)
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * 512;
      const len = 120 + Math.random() * 350;
      const x = Math.random() * (512 - len);
      ctx.strokeStyle = `rgba(60, 35, 10, ${0.12 + Math.random() * 0.15})`;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      const wave = (Math.random() - 0.5) * 4;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + len * 0.33, y + wave,
        x + len * 0.66, y - wave,
        x + len, y + wave * 0.3,
      );
      ctx.stroke();
    }

    // Wood knots (small dark ovals with ring detail)
    const knotCount = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < knotCount; k++) {
      const kx = 40 + Math.random() * 432;
      const ky = 40 + Math.random() * 432;
      const rx = 6 + Math.random() * 12;
      const ry = 4 + Math.random() * 8;

      // Dark centre
      ctx.fillStyle = 'rgba(40, 22, 5, 0.7)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concentric rings around knot
      for (let ring = 1; ring <= 3; ring++) {
        ctx.strokeStyle = `rgba(55, 32, 10, ${0.35 - ring * 0.08})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(kx, ky, rx + ring * 4, ry + ring * 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lighter highlight on knot edge
      ctx.strokeStyle = 'rgba(160, 120, 50, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(kx - 1, ky - 1, rx * 0.6, ry * 0.6, 0, 0, Math.PI);
      ctx.stroke();
    }

    // Subtle bark-edge hints along top and bottom
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 512;
      const edge = Math.random() > 0.5 ? Math.random() * 20 : 492 + Math.random() * 20;
      ctx.fillStyle = `rgba(50, 30, 10, ${0.15 + Math.random() * 0.2})`;
      ctx.fillRect(x, edge, 3 + Math.random() * 8, 2 + Math.random() * 4);
    }

    // Tiny speckle noise for organic feel
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const bright = Math.random() > 0.5;
      ctx.fillStyle = bright
        ? `rgba(180, 140, 60, ${0.06 + Math.random() * 0.08})`
        : `rgba(40, 25, 8, ${0.06 + Math.random() * 0.08})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x9B7530,
      roughness: 0.85,
      metalness: 0.0,
    });
  }

  private createWoodShingleMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Dark brown base
    ctx.fillStyle = '#5C4033';
    ctx.fillRect(0, 0, 256, 256);

    const shingleH = 32;
    const shingleW = 28;
    const rows = Math.ceil(256 / shingleH) + 1;

    for (let row = 0; row < rows; row++) {
      const yBase = row * shingleH;
      const offset = row % 2 === 0 ? 0 : shingleW * 0.5;

      for (let col = -1; col < Math.ceil(256 / shingleW) + 1; col++) {
        const x = col * shingleW + offset;

        // Per-shingle colour variation
        const shade = Math.floor(Math.random() * 30 - 15);
        const r = Math.min(255, Math.max(0, 92 + shade));
        const g = Math.min(255, Math.max(0, 64 + shade));
        const b = Math.min(255, Math.max(0, 51 + shade));
        ctx.fillStyle = `rgb(${r},${g},${b})`;

        // Rounded-bottom shingle shape
        ctx.beginPath();
        ctx.moveTo(x + 1, yBase + 2);
        ctx.lineTo(x + shingleW - 1, yBase + 2);
        ctx.lineTo(x + shingleW - 1, yBase + shingleH - 6);
        ctx.quadraticCurveTo(
          x + shingleW * 0.5, yBase + shingleH + 2,
          x + 1, yBase + shingleH - 6,
        );
        ctx.closePath();
        ctx.fill();

        // Subtle wood grain lines on each shingle
        ctx.strokeStyle = `rgba(40, 25, 15, ${0.15 + Math.random() * 0.1})`;
        ctx.lineWidth = 0.5;
        for (let g2 = 0; g2 < 3; g2++) {
          const gy = yBase + 6 + g2 * 8 + Math.random() * 4;
          ctx.beginPath();
          ctx.moveTo(x + 3, gy);
          ctx.lineTo(x + shingleW - 3, gy + (Math.random() - 0.5) * 2);
          ctx.stroke();
        }
      }

      // Shadow line between rows
      ctx.fillStyle = 'rgba(20, 10, 5, 0.4)';
      ctx.fillRect(0, yBase, 256, 2);
    }

    // Weathering speckles
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(100, 90, 70, ${0.1 + Math.random() * 0.1})`
        : `rgba(30, 18, 8, ${0.08 + Math.random() * 0.1})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x6B5040,
      roughness: 0.9,
      metalness: 0.0,
    });
  }

  private createStoneFoundationMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Mortar base
    ctx.fillStyle = '#999999';
    ctx.fillRect(0, 0, 256, 256);

    // Draw irregular stones in a rough grid
    const stoneRows = [
      { y: 0, h: 42 },
      { y: 44, h: 38 },
      { y: 84, h: 44 },
      { y: 130, h: 36 },
      { y: 168, h: 42 },
      { y: 212, h: 44 },
    ];

    for (const row of stoneRows) {
      let x = 2;
      while (x < 254) {
        const w = 28 + Math.floor(Math.random() * 36);
        const inset = 2 + Math.floor(Math.random() * 2);

        // Stone colour variation
        const base = 110 + Math.floor(Math.random() * 50);
        const r = base + Math.floor(Math.random() * 15 - 7);
        const g = base + Math.floor(Math.random() * 10 - 5);
        const b = base + Math.floor(Math.random() * 15 - 7);
        ctx.fillStyle = `rgb(${r},${g},${b})`;

        // Rounded rectangle stone
        const sx = x + inset;
        const sy = row.y + inset;
        const sw = Math.min(w - inset * 2, 254 - sx);
        const sh = row.h - inset * 2;
        if (sw > 4 && sh > 4) {
          const radius = 3 + Math.random() * 3;
          ctx.beginPath();
          ctx.moveTo(sx + radius, sy);
          ctx.lineTo(sx + sw - radius, sy);
          ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + radius);
          ctx.lineTo(sx + sw, sy + sh - radius);
          ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - radius, sy + sh);
          ctx.lineTo(sx + radius, sy + sh);
          ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - radius);
          ctx.lineTo(sx, sy + radius);
          ctx.quadraticCurveTo(sx, sy, sx + radius, sy);
          ctx.closePath();
          ctx.fill();

          // Subtle highlight on top edge
          ctx.strokeStyle = `rgba(200, 200, 200, ${0.15 + Math.random() * 0.1})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(sx + radius, sy + 1);
          ctx.lineTo(sx + sw - radius, sy + 1);
          ctx.stroke();

          // Shadow on bottom edge
          ctx.strokeStyle = `rgba(40, 40, 40, ${0.2 + Math.random() * 0.1})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(sx + radius, sy + sh - 1);
          ctx.lineTo(sx + sw - radius, sy + sh - 1);
          ctx.stroke();

          // Surface speckles on stone face
          for (let s = 0; s < 5; s++) {
            const spx = sx + 4 + Math.random() * (sw - 8);
            const spy = sy + 4 + Math.random() * (sh - 8);
            ctx.fillStyle = `rgba(${80 + Math.random() * 60}, ${80 + Math.random() * 60}, ${80 + Math.random() * 60}, 0.2)`;
            ctx.fillRect(spx, spy, 1 + Math.random() * 2, 1 + Math.random() * 2);
          }
        }

        x += w;
      }
    }

    // Mortar line darkening
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = `rgba(60, 55, 50, ${0.08 + Math.random() * 0.08})`;
      ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x999999,
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
    m.set('hair', new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 0.9, metalness: 0.0 }));
    m.set('hairLight', new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9, metalness: 0.0 }));
    m.set('boots', new THREE.MeshStandardMaterial({ color: 0x3D2B1F, roughness: 0.85, metalness: 0.0 }));
    m.set('belt', new THREE.MeshStandardMaterial({ color: 0x2E1503, roughness: 0.7, metalness: 0.0 }));
    m.set('tunic', new THREE.MeshStandardMaterial({ color: 0x4A6741, roughness: 0.75, metalness: 0.0 }));
    m.set('pants', new THREE.MeshStandardMaterial({ color: 0x6B5B4A, roughness: 0.8, metalness: 0.0 }));
    m.set('eyeWhite', new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.3, metalness: 0.0 }));
    m.set('logWood', new THREE.MeshStandardMaterial({ color: 0x9B7530, roughness: 0.8, metalness: 0.0 }));
    m.set('darkWood', new THREE.MeshStandardMaterial({ color: 0x4A3520, roughness: 0.85, metalness: 0.0 }));
    m.set('ironMetal', new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.5, metalness: 0.7 }));
    return m;
  }
}

