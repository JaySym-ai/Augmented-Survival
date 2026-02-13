/**
 * EnvironmentObjects — Procedural placement of trees and rocks using InstancedMesh.
 * Uses seeded noise for natural clustering and avoids the center building zone.
 */
import * as THREE from 'three';
import type { TerrainData } from '@augmented-survival/game-core';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTER_EXCLUSION_RADIUS = 20;
const PINE_COUNT = 120;
const OAK_COUNT = 100;
const BIRCH_COUNT = 70;
const DEAD_TREE_COUNT = 50;
const ROCK_COUNT = 150;
const IRON_COUNT = 30;
const GOLD_COUNT = 10;
const HEMP_COUNT = 200;
const BRANCH_COUNT = 300;
const MAX_PLACEMENT_ATTEMPTS = 5000;

function applyVertexColor(geometry: THREE.BufferGeometry, color: THREE.Color): void {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : 0;
  }
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);
  let vertOffset = 0;
  let idxOffset = 0;
  for (const g of geometries) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const col = g.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const base = (vertOffset + i) * 3;
      positions[base] = pos.getX(i);
      positions[base + 1] = pos.getY(i);
      positions[base + 2] = pos.getZ(i);
      if (norm) { normals[base] = norm.getX(i); normals[base + 1] = norm.getY(i); normals[base + 2] = norm.getZ(i); }
      if (col) { colors[base] = col.getX(i); colors[base + 1] = col.getY(i); colors[base + 2] = col.getZ(i); }
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) { indices[idxOffset + i] = g.index.getX(i) + vertOffset; }
      idxOffset += g.index.count;
    }
    vertOffset += pos.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (totalIndices > 0) { merged.setIndex(new THREE.BufferAttribute(indices, 1)); }
  merged.computeVertexNormals();
  return merged;
}

function createPineGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 6);
  trunk.translate(0, 0.75, 0);
  const canopy = new THREE.ConeGeometry(1.2, 2.5, 7);
  canopy.translate(0, 2.8, 0);
  applyVertexColor(trunk, new THREE.Color(0x5c3a1e));
  applyVertexColor(canopy, new THREE.Color(0x2d6b1e));
  return mergeGeometries([trunk, canopy]);
}

function createOakGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.8, 7);
  trunk.translate(0, 0.9, 0);
  const canopy = new THREE.SphereGeometry(1.5, 8, 6);
  canopy.scale(1, 0.8, 1);
  canopy.translate(0, 2.8, 0);
  applyVertexColor(trunk, new THREE.Color(0x4a3520));
  applyVertexColor(canopy, new THREE.Color(0x3a7a2e));
  return mergeGeometries([trunk, canopy]);
}

function createBirchGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.08, 0.12, 2.0, 6);
  trunk.translate(0, 1.0, 0);
  const canopy = new THREE.SphereGeometry(0.8, 7, 6);
  canopy.scale(1, 1.3, 1);
  canopy.translate(0, 2.8, 0);
  applyVertexColor(trunk, new THREE.Color(0x8a7a68));
  applyVertexColor(canopy, new THREE.Color(0x3d7a2a));
  return mergeGeometries([trunk, canopy]);
}

function createDeadTreeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6);
  trunk.translate(0, 1.1, 0);
  const stub1 = new THREE.CylinderGeometry(0.04, 0.06, 0.6, 4);
  stub1.rotateZ(Math.PI / 4);
  stub1.translate(0.2, 1.6, 0);
  const stub2 = new THREE.CylinderGeometry(0.03, 0.05, 0.5, 4);
  stub2.rotateZ(-Math.PI / 3);
  stub2.translate(-0.15, 1.9, 0.1);
  const stub3 = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 4);
  stub3.rotateX(Math.PI / 4);
  stub3.translate(0.05, 1.4, -0.15);
  const color = new THREE.Color(0x5c4a3a);
  applyVertexColor(trunk, color);
  applyVertexColor(stub1, color);
  applyVertexColor(stub2, color);
  applyVertexColor(stub3, color);
  return mergeGeometries([trunk, stub1, stub2, stub3]);
}

function createRockGeometry(rng: () => number): THREE.BufferGeometry {
  const rock = new THREE.DodecahedronGeometry(0.6, 1);
  const pos = rock.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const d = 0.85 + rng() * 0.3;
    pos.setX(i, pos.getX(i) * d);
    pos.setY(i, pos.getY(i) * (0.6 + rng() * 0.4));
    pos.setZ(i, pos.getZ(i) * d);
  }
  pos.needsUpdate = true;
  rock.computeVertexNormals();
  applyVertexColor(rock, new THREE.Color(0x6b6b6b));
  return rock;
}

function createIronRockGeometry(rng: () => number): THREE.BufferGeometry {
  const rock = new THREE.DodecahedronGeometry(0.55, 1);
  const pos = rock.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const d = 0.85 + rng() * 0.3;
    pos.setX(i, pos.getX(i) * d);
    pos.setY(i, pos.getY(i) * (0.6 + rng() * 0.4));
    pos.setZ(i, pos.getZ(i) * d);
  }
  pos.needsUpdate = true;
  rock.computeVertexNormals();
  applyVertexColor(rock, new THREE.Color(0x8B4513));
  return rock;
}

function createGoldRockGeometry(rng: () => number): THREE.BufferGeometry {
  const rock = new THREE.DodecahedronGeometry(0.45, 1);
  const pos = rock.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const d = 0.85 + rng() * 0.3;
    pos.setX(i, pos.getX(i) * d);
    pos.setY(i, pos.getY(i) * (0.6 + rng() * 0.4));
    pos.setZ(i, pos.getZ(i) * d);
  }
  pos.needsUpdate = true;
  rock.computeVertexNormals();
  applyVertexColor(rock, new THREE.Color(0xDAA520));
  return rock;
}

function createHempGeometry(): THREE.BufferGeometry {
  // Thin stem
  const stem = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 5);
  stem.translate(0, 0.4, 0);
  // Leaf-like top (flattened cone)
  const leaf = new THREE.ConeGeometry(0.25, 0.4, 6);
  leaf.translate(0, 0.95, 0);
  applyVertexColor(stem, new THREE.Color(0x6B8E23));
  applyVertexColor(leaf, new THREE.Color(0x6B8E23));
  return mergeGeometries([stem, leaf]);
}

function createBranchGeometry(rng: () => number): THREE.BufferGeometry {
  // Main twig laid flat on ground
  const main = new THREE.CylinderGeometry(0.03, 0.025, 0.5, 4);
  main.rotateZ(Math.PI / 2);
  main.translate(0, 0.02, 0);
  // Secondary twig at an angle forming a slight Y
  const secondary = new THREE.CylinderGeometry(0.025, 0.02, 0.35, 4);
  secondary.rotateZ(Math.PI / 2 + 0.5);
  secondary.translate(0.1, 0.04, 0.03);
  // Third small twig
  const third = new THREE.CylinderGeometry(0.02, 0.015, 0.25, 4);
  third.rotateZ(Math.PI / 2 - 0.4);
  third.translate(-0.08, 0.03, -0.02);
  const color = new THREE.Color(0x8B6914);
  applyVertexColor(main, color);
  applyVertexColor(secondary, color);
  applyVertexColor(third, color);
  return mergeGeometries([main, secondary, third]);
}

function getTerrainHeight(data: TerrainData, worldX: number, worldZ: number): number {
  const { width, depth, resolution, heightMap } = data;
  const gx = ((worldX + width / 2) / width) * (resolution - 1);
  const gz = ((worldZ + depth / 2) / depth) * (resolution - 1);
  const ix = Math.max(0, Math.min(Math.floor(gx), resolution - 2));
  const iz = Math.max(0, Math.min(Math.floor(gz), resolution - 2));
  const fx = gx - ix;
  const fz = gz - iz;
  const h00 = heightMap[iz * resolution + ix];
  const h10 = heightMap[iz * resolution + ix + 1];
  const h01 = heightMap[(iz + 1) * resolution + ix];
  const h11 = heightMap[(iz + 1) * resolution + ix + 1];
  const hx0 = h00 + fx * (h10 - h00);
  const hx1 = h01 + fx * (h11 - h01);
  return hx0 + fz * (hx1 - hx0);
}

function getTerrainSlope(data: TerrainData, worldX: number, worldZ: number): number {
  const eps = 0.5;
  const hL = getTerrainHeight(data, worldX - eps, worldZ);
  const hR = getTerrainHeight(data, worldX + eps, worldZ);
  const hD = getTerrainHeight(data, worldX, worldZ - eps);
  const hU = getTerrainHeight(data, worldX, worldZ + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return 1 - (ny / len);
}

export class EnvironmentObjects {
  private treeInstances: THREE.InstancedMesh;
  private oakInstances: THREE.InstancedMesh;
  private birchInstances: THREE.InstancedMesh;
  private deadTreeInstances: THREE.InstancedMesh;
  private rockInstances: THREE.InstancedMesh;
  private ironInstances: THREE.InstancedMesh;
  private goldInstances: THREE.InstancedMesh;
  private hempInstances: THREE.InstancedMesh;
  private branchInstances: THREE.InstancedMesh;
  private treePositions: Array<{ x: number; y: number; z: number }> = [];
  private rockPositions: Array<{ x: number; y: number; z: number }> = [];
  private ironPositions: Array<{ x: number; y: number; z: number }> = [];
  private goldPositions: Array<{ x: number; y: number; z: number }> = [];
  private hempPositions: Array<{ x: number; y: number; z: number }> = [];
  private branchPositions: Array<{ x: number; y: number; z: number }> = [];

  constructor(scene: THREE.Scene, terrainData: TerrainData, seed: number) {
    const rng = mulberry32(seed + 12345);
    const halfW = terrainData.width / 2;
    const halfD = terrainData.depth / 2;

    // ---- Pine Trees (prefer higher elevation) ----
    const pineGeometry = createPineGeometry();
    const pineMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.0 });
    this.treeInstances = new THREE.InstancedMesh(pineGeometry, pineMaterial, PINE_COUNT);
    this.treeInstances.castShadow = true;
    this.treeInstances.receiveShadow = true;
    this.treeInstances.name = 'pines';

    const pineMatrix = new THREE.Matrix4();
    let pinesPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && pinesPlaced < PINE_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.3) continue;
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      // Prefer higher elevation
      if (heightNorm < 0.3) continue;
      if (heightNorm > 0.85) continue;
      const clusterNoise = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.5 + 0.5;
      if (rng() > clusterNoise * 0.8 + 0.1) continue;
      const scale = 0.7 + rng() * 0.6;
      const rotY = rng() * Math.PI * 2;
      pineMatrix.identity();
      pineMatrix.makeRotationY(rotY);
      pineMatrix.scale(new THREE.Vector3(scale, scale, scale));
      pineMatrix.setPosition(x, height, z);
      this.treeInstances.setMatrixAt(pinesPlaced, pineMatrix);
      this.treePositions.push({ x, y: height, z });
      pinesPlaced++;
    }
    this.treeInstances.count = pinesPlaced;
    this.treeInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.treeInstances);

    // ---- Oak Trees (prefer low-mid elevation, flat terrain) ----
    const oakGeometry = createOakGeometry();
    const oakMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.0 });
    this.oakInstances = new THREE.InstancedMesh(oakGeometry, oakMaterial, OAK_COUNT);
    this.oakInstances.castShadow = true;
    this.oakInstances.receiveShadow = true;
    this.oakInstances.name = 'oaks';

    const oakMatrix = new THREE.Matrix4();
    let oaksPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && oaksPlaced < OAK_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.25) continue;
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      // Prefer low-mid elevation
      if (heightNorm > 0.6) continue;
      const clusterNoise = Math.sin(x * 0.1) * Math.cos(z * 0.08) * 0.5 + 0.5;
      if (rng() > clusterNoise * 0.7 + 0.15) continue;
      const scale = 0.8 + rng() * 0.5;
      const rotY = rng() * Math.PI * 2;
      oakMatrix.identity();
      oakMatrix.makeRotationY(rotY);
      oakMatrix.scale(new THREE.Vector3(scale, scale, scale));
      oakMatrix.setPosition(x, height, z);
      this.oakInstances.setMatrixAt(oaksPlaced, oakMatrix);
      this.treePositions.push({ x, y: height, z });
      oaksPlaced++;
    }
    this.oakInstances.count = oaksPlaced;
    this.oakInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.oakInstances);

    // ---- Birch Trees (prefer flat grasslands) ----
    const birchGeom = createBirchGeometry();
    const birchMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.0 });
    this.birchInstances = new THREE.InstancedMesh(birchGeom, birchMaterial, BIRCH_COUNT);
    this.birchInstances.castShadow = true;
    this.birchInstances.receiveShadow = true;
    this.birchInstances.name = 'birches';

    const birchMatrix = new THREE.Matrix4();
    let birchesPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && birchesPlaced < BIRCH_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.15) continue;
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      // Prefer flat grasslands
      if (heightNorm > 0.4) continue;
      const clusterNoise = Math.cos(x * 0.12) * Math.sin(z * 0.1) * 0.5 + 0.5;
      if (rng() > clusterNoise * 0.7 + 0.15) continue;
      const scale = 0.7 + rng() * 0.5;
      const rotY = rng() * Math.PI * 2;
      birchMatrix.identity();
      birchMatrix.makeRotationY(rotY);
      birchMatrix.scale(new THREE.Vector3(scale, scale, scale));
      birchMatrix.setPosition(x, height, z);
      this.birchInstances.setMatrixAt(birchesPlaced, birchMatrix);
      this.treePositions.push({ x, y: height, z });
      birchesPlaced++;
    }
    this.birchInstances.count = birchesPlaced;
    this.birchInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.birchInstances);

    // ---- Dead Trees (anywhere, sparse) ----
    const deadGeometry = createDeadTreeGeometry();
    const deadMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
    this.deadTreeInstances = new THREE.InstancedMesh(deadGeometry, deadMaterial, DEAD_TREE_COUNT);
    this.deadTreeInstances.castShadow = true;
    this.deadTreeInstances.receiveShadow = true;
    this.deadTreeInstances.name = 'deadTrees';

    const deadMatrix = new THREE.Matrix4();
    let deadPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && deadPlaced < DEAD_TREE_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.4) continue;
      const height = getTerrainHeight(terrainData, x, z);
      // Sparse — skip 80% of candidates
      if (rng() > 0.2) continue;
      const scale = 0.6 + rng() * 0.6;
      const rotY = rng() * Math.PI * 2;
      deadMatrix.identity();
      deadMatrix.makeRotationY(rotY);
      deadMatrix.scale(new THREE.Vector3(scale, scale, scale));
      deadMatrix.setPosition(x, height, z);
      this.deadTreeInstances.setMatrixAt(deadPlaced, deadMatrix);
      this.treePositions.push({ x, y: height, z });
      deadPlaced++;
    }
    this.deadTreeInstances.count = deadPlaced;
    this.deadTreeInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.deadTreeInstances);

    // ---- Rocks ----
    const rockGeometry = createRockGeometry(rng);
    const rockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.05 });
    this.rockInstances = new THREE.InstancedMesh(rockGeometry, rockMaterial, ROCK_COUNT);
    this.rockInstances.castShadow = true;
    this.rockInstances.receiveShadow = true;
    this.rockInstances.name = 'rocks';

    const rockMatrix = new THREE.Matrix4();
    let rocksPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && rocksPlaced < ROCK_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      const rockProbability = slope * 0.6 + heightNorm * 0.4;
      if (rng() > rockProbability + 0.15) continue;
      const scale = 0.4 + rng() * 0.8;
      const rotX = rng() * Math.PI * 0.3;
      const rotY = rng() * Math.PI * 2;
      const rotZ = rng() * Math.PI * 0.3;
      rockMatrix.identity();
      rockMatrix.makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ));
      rockMatrix.scale(new THREE.Vector3(scale, scale * (0.6 + rng() * 0.4), scale));
      rockMatrix.setPosition(x, height - 0.1 * scale, z);
      this.rockInstances.setMatrixAt(rocksPlaced, rockMatrix);
      this.rockPositions.push({ x, y: height, z });
      rocksPlaced++;
    }
    this.rockInstances.count = rocksPlaced;
    this.rockInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.rockInstances);

    // ---- Iron Ore Rocks ----
    const ironGeometry = createIronRockGeometry(rng);
    const ironMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.4 });
    this.ironInstances = new THREE.InstancedMesh(ironGeometry, ironMaterial, IRON_COUNT);
    this.ironInstances.castShadow = true;
    this.ironInstances.receiveShadow = true;
    this.ironInstances.name = 'ironRocks';

    const ironMatrix = new THREE.Matrix4();
    let ironPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && ironPlaced < IRON_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      // Prefer higher elevation and steeper slopes
      const ironProbability = slope * 0.5 + heightNorm * 0.5;
      if (rng() > ironProbability * 0.6) continue;
      const scale = 0.4 + rng() * 0.6;
      const rotX = rng() * Math.PI * 0.3;
      const rotY = rng() * Math.PI * 2;
      const rotZ = rng() * Math.PI * 0.3;
      ironMatrix.identity();
      ironMatrix.makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ));
      ironMatrix.scale(new THREE.Vector3(scale, scale * (0.6 + rng() * 0.4), scale));
      ironMatrix.setPosition(x, height - 0.1 * scale, z);
      this.ironInstances.setMatrixAt(ironPlaced, ironMatrix);
      this.ironPositions.push({ x, y: height, z });
      ironPlaced++;
    }
    this.ironInstances.count = ironPlaced;
    this.ironInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.ironInstances);

    // ---- Gold Ore Rocks ----
    const goldGeometry = createGoldRockGeometry(rng);
    const goldMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 });
    this.goldInstances = new THREE.InstancedMesh(goldGeometry, goldMaterial, GOLD_COUNT);
    this.goldInstances.castShadow = true;
    this.goldInstances.receiveShadow = true;
    this.goldInstances.name = 'goldRocks';

    const goldMatrix = new THREE.Matrix4();
    let goldPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && goldPlaced < GOLD_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      // Only at the highest elevations
      if (heightNorm < 0.7) continue;
      if (rng() > heightNorm * 0.5) continue;
      const scale = 0.35 + rng() * 0.5;
      const rotX = rng() * Math.PI * 0.3;
      const rotY = rng() * Math.PI * 2;
      const rotZ = rng() * Math.PI * 0.3;
      goldMatrix.identity();
      goldMatrix.makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ));
      goldMatrix.scale(new THREE.Vector3(scale, scale * (0.6 + rng() * 0.4), scale));
      goldMatrix.setPosition(x, height - 0.1 * scale, z);
      this.goldInstances.setMatrixAt(goldPlaced, goldMatrix);
      this.goldPositions.push({ x, y: height, z });
      goldPlaced++;
    }
    this.goldInstances.count = goldPlaced;
    this.goldInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.goldInstances);

    // ---- Hemp Plants ----
    const hempGeometry = createHempGeometry();
    const hempMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
    this.hempInstances = new THREE.InstancedMesh(hempGeometry, hempMaterial, HEMP_COUNT);
    this.hempInstances.castShadow = true;
    this.hempInstances.receiveShadow = true;
    this.hempInstances.name = 'hemp';

    const hempMatrix = new THREE.Matrix4();
    let hempPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && hempPlaced < HEMP_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.25) continue;
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      // Prefer grasslands / low areas
      if (heightNorm > 0.5) continue;
      if (rng() > 0.5) continue;
      const scale = 0.7 + rng() * 0.6;
      const rotY = rng() * Math.PI * 2;
      hempMatrix.identity();
      hempMatrix.makeRotationY(rotY);
      hempMatrix.scale(new THREE.Vector3(scale, scale, scale));
      hempMatrix.setPosition(x, height, z);
      this.hempInstances.setMatrixAt(hempPlaced, hempMatrix);
      this.hempPositions.push({ x, y: height, z });
      hempPlaced++;
    }
    this.hempInstances.count = hempPlaced;
    this.hempInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.hempInstances);

    // ---- Fallen Branches ----
    const branchGeometry = createBranchGeometry(rng);
    const branchMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 });
    this.branchInstances = new THREE.InstancedMesh(branchGeometry, branchMaterial, BRANCH_COUNT);
    this.branchInstances.receiveShadow = true;
    this.branchInstances.name = 'branches';

    const branchMatrix = new THREE.Matrix4();
    let branchesPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && branchesPlaced < BRANCH_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.4) continue;
      const height = getTerrainHeight(terrainData, x, z);
      // Scatter widely — accept most terrain
      if (rng() > 0.6) continue;
      const scale = 0.6 + rng() * 0.8;
      const rotY = rng() * Math.PI * 2;
      branchMatrix.identity();
      branchMatrix.makeRotationY(rotY);
      branchMatrix.scale(new THREE.Vector3(scale, scale, scale));
      branchMatrix.setPosition(x, height, z);
      this.branchInstances.setMatrixAt(branchesPlaced, branchMatrix);
      this.branchPositions.push({ x, y: height, z });
      branchesPlaced++;
    }
    this.branchInstances.count = branchesPlaced;
    this.branchInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.branchInstances);
  }

  getTreePositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.treePositions];
  }

  getRockPositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.rockPositions];
  }

  getIronPositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.ironPositions];
  }

  getGoldPositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.goldPositions];
  }

  getHempPositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.hempPositions];
  }

  getBranchPositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.branchPositions];
  }

  dispose(): void {
    this.treeInstances.geometry.dispose();
    (this.treeInstances.material as THREE.Material).dispose();
    this.treeInstances.dispose();
    this.oakInstances.geometry.dispose();
    (this.oakInstances.material as THREE.Material).dispose();
    this.oakInstances.dispose();
    this.birchInstances.geometry.dispose();
    (this.birchInstances.material as THREE.Material).dispose();
    this.birchInstances.dispose();
    this.deadTreeInstances.geometry.dispose();
    (this.deadTreeInstances.material as THREE.Material).dispose();
    this.deadTreeInstances.dispose();
    this.rockInstances.geometry.dispose();
    (this.rockInstances.material as THREE.Material).dispose();
    this.rockInstances.dispose();
    this.ironInstances.geometry.dispose();
    (this.ironInstances.material as THREE.Material).dispose();
    this.ironInstances.dispose();
    this.goldInstances.geometry.dispose();
    (this.goldInstances.material as THREE.Material).dispose();
    this.goldInstances.dispose();
    this.hempInstances.geometry.dispose();
    (this.hempInstances.material as THREE.Material).dispose();
    this.hempInstances.dispose();
    this.branchInstances.geometry.dispose();
    (this.branchInstances.material as THREE.Material).dispose();
    this.branchInstances.dispose();
  }
}

