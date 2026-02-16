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
    const logMat = this.createLogWoodMaterial();
    const darkWood = this.mat('darkWood');
    const ironMetal = this.mat('ironMetal');
    const stoneMat = this.createStoneFoundationMaterial();
    const shingleMat = this.createWoodShingleMaterial();
    const chinkMat = new THREE.MeshStandardMaterial({ color: 0xD2C4A0, roughness: 1.0, metalness: 0.0 });
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
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, W + overhang * 2, 8), logMat));
        log.rotation.z = Math.PI / 2;
        log.position.set(0, y, side * D / 2);
        walls.add(log);
      }

      // Left & right walls (along Z axis)
      for (const side of [-1, 1]) {
        const log = shad(new THREE.Mesh(new THREE.CylinderGeometry(r, r, D + overhang * 2, 8), logMat));
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

    // Stone step in front of door
    const doorStep = shad(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.25), stoneMat));
    doorStep.position.set(0, -doorH / 2 - 0.05, 0.15);
    doorGroup.add(doorStep);

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

