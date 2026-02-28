/**
 * OpenClawArtGenerator — Procedural mesh generation driven by ArtDNA.
 *
 * Each OpenClaw agent has unique visual DNA that controls:
 * - Building colors, proportions, and decorations
 * - Road and path styling
 * - Custom decorative elements (banners, fences, gardens, lights)
 *
 * As agents evolve their ArtDNA, buildings visually transform —
 * colors shift, proportions change, decorations appear or disappear.
 * This creates a living, evolving aesthetic for each agent's town.
 */

import * as THREE from 'three';
import { BuildingType } from '@augmented-survival/game-core';
import type { ArtDNA, ColorGene, RoadSegment } from '@augmented-survival/game-core';

/**
 * Convert an HSL ColorGene to a THREE.Color.
 */
function geneToColor(gene: ColorGene, varianceSeed?: number): THREE.Color {
  let h = gene.hue / 360;
  let s = gene.saturation;
  let l = gene.lightness;

  // Apply variance if seed provided
  if (varianceSeed !== undefined) {
    const v = gene.variance;
    h = (h + (Math.sin(varianceSeed * 12.9898) * 0.5 + 0.5 - 0.5) * v * 0.1 + 1) % 1;
    s = Math.max(0, Math.min(1, s + (Math.sin(varianceSeed * 78.233) * 0.5) * v));
    l = Math.max(0.1, Math.min(0.9, l + (Math.cos(varianceSeed * 43.758) * 0.5) * v));
  }

  return new THREE.Color().setHSL(h, s, l);
}

/**
 * Create a material from a ColorGene.
 */
function geneMaterial(gene: ColorGene, varianceSeed?: number, roughness = 0.8): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: geneToColor(gene, varianceSeed),
    roughness,
    metalness: 0.1,
  });
}

/**
 * OpenClawArtGenerator creates procedural Three.js meshes
 * driven by an agent's ArtDNA.
 */
export class OpenClawArtGenerator {
  private dna: ArtDNA;
  private generatedMeshes: THREE.Object3D[] = [];
  private generatedTextures: THREE.Texture[] = [];

  constructor(dna: ArtDNA) {
    this.dna = dna;
  }

  /** Update the DNA (e.g., after mutation/evolution) */
  setDNA(dna: ArtDNA): void {
    this.dna = dna;
  }

  /**
   * Create a building mesh influenced by ArtDNA.
   * Applies DNA-driven colors, proportions, and decorations
   * on top of the base building geometry.
   */
  createBuilding(type: BuildingType, buildingIndex = 0): THREE.Group {
    switch (type) {
      case BuildingType.TownCenter:
        return this.createTownCenter(buildingIndex);
      case BuildingType.House:
        return this.createHouse(buildingIndex);
      case BuildingType.StorageBarn:
        return this.createBarn(buildingIndex);
      case BuildingType.WoodcutterHut:
        return this.createWorkshop(buildingIndex, 'woodcutter');
      case BuildingType.FarmField:
        return this.createFarm(buildingIndex);
      case BuildingType.Quarry:
        return this.createWorkshop(buildingIndex, 'quarry');
      default:
        return this.createHouse(buildingIndex);
    }
  }

  /**
   * Create a DNA-influenced house.
   */
  private createHouse(index: number): THREE.Group {
    const group = new THREE.Group();
    const dna = this.dna;
    const wallMat = geneMaterial(dna.primaryColor, index);
    const roofMat = geneMaterial(dna.roofColor, index, 0.6);
    const accentMat = geneMaterial(dna.accentColor, index);

    const w = 1.8 * dna.shape.widthScale;
    const h = 1.5 * dna.shape.heightScale;
    const d = 2.0 * dna.shape.widthScale;

    // Walls
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = h / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof — steepness from DNA
    const roofHeight = 0.8 + dna.shape.roofSteepness * 1.2;
    const roofGeo = new THREE.ConeGeometry(
      Math.max(w, d) * 0.75,
      roofHeight,
      dna.shape.roundness > 0.5 ? 16 : 4, // Round vs angular roof
    );
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + roofHeight / 2;
    roof.castShadow = true;
    group.add(roof);

    // Door
    const doorGeo = new THREE.BoxGeometry(0.3, 0.5, 0.05);
    const door = new THREE.Mesh(doorGeo, accentMat);
    door.position.set(0, 0.25, d / 2 + 0.02);
    group.add(door);

    // Windows (if DNA says so)
    if (dna.decoration.hasWindows) {
      for (const side of [-1, 1]) {
        const windowGeo = new THREE.BoxGeometry(0.2, 0.2, 0.05);
        const windowMesh = new THREE.Mesh(windowGeo, accentMat);
        windowMesh.position.set(side * w * 0.3, h * 0.6, d / 2 + 0.02);
        group.add(windowMesh);
      }
    }

    // Chimney
    if (dna.decoration.hasChimney) {
      const chimneyGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      const chimney = new THREE.Mesh(chimneyGeo, new THREE.MeshStandardMaterial({
        color: 0x666666, roughness: 0.9,
      }));
      chimney.position.set(w * 0.3, h + roofHeight * 0.6, 0);
      chimney.castShadow = true;
      group.add(chimney);
    }

    // Garden patches
    if (dna.decoration.hasGardens) {
      const gardenMat = new THREE.MeshStandardMaterial({
        color: 0x228B22, roughness: 0.9,
      });
      for (const side of [-1, 1]) {
        const gardenGeo = new THREE.BoxGeometry(0.6, 0.05, 0.4);
        const garden = new THREE.Mesh(gardenGeo, gardenMat);
        garden.position.set(side * (w / 2 + 0.4), 0.025, d * 0.2);
        group.add(garden);
      }
    }

    // Fence
    if (dna.decoration.fenceAmount > 0.2) {
      this.addFence(group, w, d, dna.decoration.fenceAmount, accentMat);
    }

    this.generatedMeshes.push(group);
    return group;
  }

  /**
   * Create a DNA-influenced town center.
   */
  private createTownCenter(index: number): THREE.Group {
    const group = new THREE.Group();
    const dna = this.dna;
    const wallMat = geneMaterial(dna.primaryColor, index);
    const roofMat = geneMaterial(dna.roofColor, index, 0.6);
    const accentMat = geneMaterial(dna.accentColor, index);

    const baseW = 3.5 * dna.shape.widthScale;
    const baseH = 2.5 * dna.shape.heightScale;
    const baseD = 3.5 * dna.shape.widthScale;

    // Main structure
    const mainGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const main = new THREE.Mesh(mainGeo, wallMat);
    main.position.y = baseH / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    // Roof
    const roofH = 1.2 + dna.shape.roofSteepness * 1.5;
    const segments = dna.shape.roundness > 0.5 ? 16 : 4;
    const roofGeo = new THREE.ConeGeometry(baseW * 0.7, roofH, segments);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = baseH + roofH / 2;
    roof.castShadow = true;
    group.add(roof);

    // Decorative pillars at corners
    if (dna.shape.detailLevel > 0.3) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const pillarGeo = new THREE.CylinderGeometry(0.1, 0.12, baseH + 0.3, 8);
          const pillar = new THREE.Mesh(pillarGeo, accentMat);
          pillar.position.set(sx * baseW * 0.45, (baseH + 0.3) / 2, sz * baseD * 0.45);
          pillar.castShadow = true;
          group.add(pillar);
        }
      }
    }

    // Banners
    if (dna.decoration.hasBanners) {
      const bannerMat = geneMaterial(dna.accentColor, index + 100, 0.5);
      for (const side of [-1, 1]) {
        const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
        const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        pole.position.set(side * baseW * 0.55, baseH + 0.75, baseD * 0.55);
        group.add(pole);

        const bannerGeo = new THREE.PlaneGeometry(0.3, 0.6);
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(side * baseW * 0.55, baseH + 0.9, baseD * 0.55 + 0.02);
        group.add(banner);
      }
    }

    // Torches at entrance
    if (dna.decoration.lightingDensity > 0.2) {
      const torchMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xFF6600, emissive: 0xFF4400, emissiveIntensity: 0.8,
      });
      for (const side of [-1, 1]) {
        const torchGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6);
        const torch = new THREE.Mesh(torchGeo, torchMat);
        torch.position.set(side * baseW * 0.3, baseH * 0.5, baseD / 2 + 0.15);
        group.add(torch);

        const flameGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(side * baseW * 0.3, baseH * 0.5 + 0.45, baseD / 2 + 0.15);
        group.add(flame);
      }
    }

    this.generatedMeshes.push(group);
    return group;
  }

  /**
   * Create a DNA-influenced storage barn.
   */
  private createBarn(index: number): THREE.Group {
    const group = new THREE.Group();
    const dna = this.dna;
    const wallMat = geneMaterial(dna.primaryColor, index);
    const roofMat = geneMaterial(dna.roofColor, index, 0.6);

    const w = 2.5 * dna.shape.widthScale;
    const h = 2.0 * dna.shape.heightScale;
    const d = 3.0 * dna.shape.widthScale;

    // Barn body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Barn roof — A-frame style, steepness from DNA
    const roofH = 1.0 + dna.shape.roofSteepness * 1.0;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w * 0.6, 0);
    roofShape.lineTo(0, roofH);
    roofShape.lineTo(w * 0.6, 0);
    roofShape.lineTo(-w * 0.6, 0);

    const extrudeSettings = { steps: 1, depth: d * 1.05, bevelEnabled: false };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h, -d * 0.525);
    roof.castShadow = true;
    group.add(roof);

    // Barn doors (large)
    const accentMat = geneMaterial(dna.accentColor, index);
    const doorGeo = new THREE.BoxGeometry(w * 0.4, h * 0.7, 0.05);
    const door = new THREE.Mesh(doorGeo, accentMat);
    door.position.set(0, h * 0.35, d / 2 + 0.02);
    group.add(door);

    this.generatedMeshes.push(group);
    return group;
  }

  /**
   * Create a DNA-influenced workshop (woodcutter or quarry).
   */
  private createWorkshop(index: number, workshopType: 'woodcutter' | 'quarry'): THREE.Group {
    const group = new THREE.Group();
    const dna = this.dna;
    const wallMat = geneMaterial(dna.primaryColor, index);
    const roofMat = geneMaterial(dna.roofColor, index, 0.6);

    const w = 1.6 * dna.shape.widthScale;
    const h = 1.2 * dna.shape.heightScale;
    const d = 1.6 * dna.shape.widthScale;

    // Small hut body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Lean-to style roof
    const roofH = 0.5 + dna.shape.roofSteepness * 0.8;
    const roofGeo = new THREE.BoxGeometry(w * 1.2, 0.08, d * 1.2);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h + roofH * 0.3, 0);
    roof.rotation.x = dna.shape.roofSteepness * 0.3;
    roof.castShadow = true;
    group.add(roof);

    // Workshop-specific decorations
    if (workshopType === 'woodcutter' && dna.shape.detailLevel > 0.3) {
      // Log pile
      const logMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(w * 0.7, 0.08 + i * 0.16, (i - 1) * 0.2);
        group.add(log);
      }
    }

    if (workshopType === 'quarry' && dna.shape.detailLevel > 0.3) {
      // Stone pile
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const stoneGeo = new THREE.BoxGeometry(
          0.15 + Math.random() * 0.1,
          0.12 + Math.random() * 0.08,
          0.15 + Math.random() * 0.1,
        );
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(
          -w * 0.6 + Math.random() * 0.3,
          0.06 + (i > 1 ? 0.14 : 0),
          (Math.random() - 0.5) * 0.4,
        );
        stone.rotation.y = Math.random() * Math.PI;
        group.add(stone);
      }
    }

    this.generatedMeshes.push(group);
    return group;
  }

  /**
   * Create a DNA-influenced farm field.
   */
  private createFarm(index: number): THREE.Group {
    const group = new THREE.Group();
    const dna = this.dna;

    const w = 3.5 * dna.shape.widthScale;
    const d = 3.5 * dna.shape.widthScale;

    // Soil base
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x5C4033, roughness: 0.95,
    });
    const soilGeo = new THREE.BoxGeometry(w, 0.1, d);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.05;
    soil.receiveShadow = true;
    group.add(soil);

    // Crop rows — color influenced by accent DNA
    const cropColor = geneToColor(dna.accentColor, index);
    const greenBlend = new THREE.Color(0x228B22).lerp(cropColor, 0.3);
    const cropMat = new THREE.MeshStandardMaterial({
      color: greenBlend, roughness: 0.9,
    });

    const rows = 4 + Math.floor(dna.shape.detailLevel * 4);
    const spacing = d / (rows + 1);
    for (let i = 0; i < rows; i++) {
      const rowGeo = new THREE.BoxGeometry(w * 0.85, 0.15, 0.12);
      const row = new THREE.Mesh(rowGeo, cropMat);
      row.position.set(0, 0.18, -d / 2 + spacing * (i + 1));
      group.add(row);
    }

    // Fence if DNA says so
    if (dna.decoration.fenceAmount > 0.3) {
      const fenceMat = new THREE.MeshStandardMaterial({
        color: 0x8B4513, roughness: 0.85,
      });
      this.addFence(group, w, d, dna.decoration.fenceAmount, fenceMat);
    }

    this.generatedMeshes.push(group);
    return group;
  }

  /**
   * Add a fence around a building footprint.
   */
  private addFence(
    group: THREE.Group,
    width: number,
    depth: number,
    amount: number,
    material: THREE.Material,
  ): void {
    const postCount = Math.floor(4 + amount * 8);
    const postSpacing = (width + depth) * 2 / postCount;
    const fenceH = 0.3 + amount * 0.3;

    // Simple post-and-rail fence around perimeter
    const perimeter = [
      { axis: 'x', fixed: 'z', fixedVal: -depth / 2 - 0.3, from: -width / 2 - 0.3, to: width / 2 + 0.3 },
      { axis: 'x', fixed: 'z', fixedVal: depth / 2 + 0.3, from: -width / 2 - 0.3, to: width / 2 + 0.3 },
      { axis: 'z', fixed: 'x', fixedVal: -width / 2 - 0.3, from: -depth / 2 - 0.3, to: depth / 2 + 0.3 },
      { axis: 'z', fixed: 'x', fixedVal: width / 2 + 0.3, from: -depth / 2 - 0.3, to: depth / 2 + 0.3 },
    ];

    for (const side of perimeter) {
      const len = side.to - side.from;
      const posts = Math.max(2, Math.floor(len / postSpacing));
      for (let i = 0; i <= posts; i++) {
        const t = side.from + (i / posts) * len;
        const postGeo = new THREE.BoxGeometry(0.04, fenceH, 0.04);
        const post = new THREE.Mesh(postGeo, material);
        if (side.axis === 'x') {
          post.position.set(t, fenceH / 2, side.fixedVal);
        } else {
          post.position.set(side.fixedVal, fenceH / 2, t);
        }
        group.add(post);
      }

      // Rail connecting posts
      const railGeo = side.axis === 'x'
        ? new THREE.BoxGeometry(len, 0.03, 0.03)
        : new THREE.BoxGeometry(0.03, 0.03, len);
      const rail = new THREE.Mesh(railGeo, material);
      const midPoint = (side.from + side.to) / 2;
      if (side.axis === 'x') {
        rail.position.set(midPoint, fenceH * 0.6, side.fixedVal);
      } else {
        rail.position.set(side.fixedVal, fenceH * 0.6, midPoint);
      }
      group.add(rail);
    }
  }

  /**
   * Create a road mesh segment with DNA-driven styling.
   */
  createRoad(segment: RoadSegment): THREE.Mesh {
    const dna = this.dna;
    const pathMat = geneMaterial(dna.pathColor, 0, 0.95);

    const dx = segment.endX - segment.startX;
    const dz = segment.endZ - segment.startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    const roadGeo = new THREE.BoxGeometry(segment.width, 0.05, length);
    const road = new THREE.Mesh(roadGeo, pathMat);

    // Position at midpoint
    road.position.set(
      (segment.startX + segment.endX) / 2,
      0.03,
      (segment.startZ + segment.endZ) / 2,
    );
    road.rotation.y = angle;
    road.receiveShadow = true;

    this.generatedMeshes.push(road);
    return road;
  }

  /**
   * Create a town marker/signpost for the agent.
   */
  createTownMarker(agentName: string, isFounder = false): THREE.Group {
    const group = new THREE.Group();
    const dna = this.dna;
    const accentMat = geneMaterial(dna.accentColor, 999);

    const poleMat = isFounder
      ? new THREE.MeshStandardMaterial({
          color: 0x9fdfff,
          roughness: 0.25,
          metalness: 0.45,
          emissive: 0x1a4f72,
          emissiveIntensity: 0.35,
        })
      : new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });

    // Signpost pole
    const poleGeo = new THREE.CylinderGeometry(isFounder ? 0.06 : 0.05, isFounder ? 0.07 : 0.06, 2.0, 6);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.0;
    pole.castShadow = true;
    group.add(pole);

    // Sign board
    const signGeo = new THREE.BoxGeometry(1.35, 0.45, 0.08);
    const signMat = isFounder
      ? new THREE.MeshStandardMaterial({
          color: 0xc9f6ff,
          roughness: 0.2,
          metalness: 0.35,
          emissive: 0x45bff6,
          emissiveIntensity: 0.5,
        })
      : accentMat;
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = 1.8;
    sign.castShadow = true;
    group.add(sign);

    // Top finial (shape driven by DNA roundness)
    const finialMat = isFounder
      ? new THREE.MeshStandardMaterial({
          color: 0xd9fbff,
          roughness: 0.15,
          metalness: 0.4,
          emissive: 0x4ecfff,
          emissiveIntensity: 0.55,
        })
      : accentMat;
    if (dna.shape.roundness > 0.4) {
      const finialGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const finial = new THREE.Mesh(finialGeo, finialMat);
      finial.position.y = 2.15;
      group.add(finial);
    } else {
      const finialGeo = new THREE.ConeGeometry(0.075, 0.18, 4);
      const finial = new THREE.Mesh(finialGeo, finialMat);
      finial.position.y = 2.15;
      group.add(finial);
    }

    // Agent name label (canvas-generated sprite; no external assets)
    const label = this.createNameSprite(agentName, isFounder);
    label.position.y = isFounder ? 2.9 : 2.65;
    group.add(label);

    if (isFounder) {
      // FrostD4D founder gets a distinct icy halo and crystal beacon.
      const haloGeo = new THREE.TorusGeometry(0.55, 0.03, 10, 28);
      const haloMat = new THREE.MeshStandardMaterial({
        color: 0x96efff,
        emissive: 0x38c6ff,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.25,
        transparent: true,
        opacity: 0.82,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.y = 1.35;
      halo.rotation.x = Math.PI / 2;
      halo.castShadow = true;
      group.add(halo);

      const crystalGeo = new THREE.OctahedronGeometry(0.16, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xe3fcff,
        roughness: 0.1,
        metalness: 0.45,
        emissive: 0x63d8ff,
        emissiveIntensity: 0.75,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 2.35;
      crystal.castShadow = true;
      group.add(crystal);
    }

    this.generatedMeshes.push(group);
    return group;
  }

  private createNameSprite(agentName: string, isFounder: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.drawNameplate(ctx, canvas.width, canvas.height, isFounder);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = isFounder ? '700 56px "Trebuchet MS", sans-serif' : '600 50px "Trebuchet MS", sans-serif';
      ctx.fillStyle = isFounder ? '#e9fcff' : '#ffffff';
      ctx.shadowColor = isFounder ? 'rgba(110, 233, 255, 0.95)' : 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = isFounder ? 18 : 10;
      ctx.fillText(agentName, canvas.width / 2, canvas.height / 2 + 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.generatedTextures.push(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(isFounder ? 7.2 : 6.0, isFounder ? 1.85 : 1.55, 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  private drawNameplate(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isFounder: boolean,
  ): void {
    const x = 12;
    const y = 10;
    const w = width - 24;
    const h = height - 20;

    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    if (isFounder) {
      gradient.addColorStop(0, 'rgba(18, 52, 76, 0.92)');
      gradient.addColorStop(1, 'rgba(10, 29, 43, 0.9)');
    } else {
      gradient.addColorStop(0, 'rgba(30, 26, 36, 0.85)');
      gradient.addColorStop(1, 'rgba(20, 18, 28, 0.84)');
    }

    this.roundedRectPath(ctx, x, y, w, h, 18);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = isFounder ? 6 : 4;
    ctx.strokeStyle = isFounder ? 'rgba(136, 238, 255, 0.95)' : 'rgba(255, 232, 184, 0.82)';
    ctx.stroke();
  }

  private roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  /**
   * Dispose of all generated meshes and materials.
   */
  dispose(): void {
    for (const mesh of this.generatedMeshes) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        } else if (child instanceof THREE.Sprite) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.generatedMeshes = [];

    for (const texture of this.generatedTextures) {
      texture.dispose();
    }
    this.generatedTextures = [];
  }
}
