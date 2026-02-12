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
const TREE_COUNT = 600;
const ROCK_COUNT = 150;
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

function createTreeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 6);
  trunk.translate(0, 0.75, 0);
  const canopy = new THREE.ConeGeometry(1.2, 2.5, 7);
  canopy.translate(0, 2.8, 0);
  applyVertexColor(trunk, new THREE.Color(0x5c3a1e));
  applyVertexColor(canopy, new THREE.Color(0x2d6b1e));
  return mergeGeometries([trunk, canopy]);
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
  private rockInstances: THREE.InstancedMesh;
  private treePositions: Array<{ x: number; y: number; z: number }> = [];
  private rockPositions: Array<{ x: number; y: number; z: number }> = [];

  constructor(scene: THREE.Scene, terrainData: TerrainData, seed: number) {
    const rng = mulberry32(seed + 12345);
    const halfW = terrainData.width / 2;
    const halfD = terrainData.depth / 2;

    // ---- Trees ----
    const treeGeometry = createTreeGeometry();
    const treeMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.0 });
    this.treeInstances = new THREE.InstancedMesh(treeGeometry, treeMaterial, TREE_COUNT);
    this.treeInstances.castShadow = true;
    this.treeInstances.receiveShadow = true;
    this.treeInstances.name = 'trees';

    const treeMatrix = new THREE.Matrix4();
    let treesPlaced = 0;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && treesPlaced < TREE_COUNT; attempt++) {
      const x = (rng() - 0.5) * terrainData.width * 0.9;
      const z = (rng() - 0.5) * terrainData.depth * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < CENTER_EXCLUSION_RADIUS) continue;
      if (Math.abs(x) > halfW * 0.95 || Math.abs(z) > halfD * 0.95) continue;
      const slope = getTerrainSlope(terrainData, x, z);
      if (slope > 0.3) continue;
      const height = getTerrainHeight(terrainData, x, z);
      const heightNorm = height / 8;
      const clusterNoise = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.5 + 0.5;
      if (rng() > clusterNoise * 0.8 + 0.1) continue;
      if (heightNorm > 0.85) continue;
      const scale = 0.7 + rng() * 0.6;
      const rotY = rng() * Math.PI * 2;
      treeMatrix.identity();
      treeMatrix.makeRotationY(rotY);
      treeMatrix.scale(new THREE.Vector3(scale, scale, scale));
      treeMatrix.setPosition(x, height, z);
      this.treeInstances.setMatrixAt(treesPlaced, treeMatrix);
      this.treePositions.push({ x, y: height, z });
      treesPlaced++;
    }
    this.treeInstances.count = treesPlaced;
    this.treeInstances.instanceMatrix.needsUpdate = true;
    scene.add(this.treeInstances);

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
  }

  getTreePositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.treePositions];
  }

  getRockPositions(): Array<{ x: number; y: number; z: number }> {
    return [...this.rockPositions];
  }

  dispose(): void {
    this.treeInstances.geometry.dispose();
    (this.treeInstances.material as THREE.Material).dispose();
    this.treeInstances.dispose();
    this.rockInstances.geometry.dispose();
    (this.rockInstances.material as THREE.Material).dispose();
    this.rockInstances.dispose();
  }
}

