import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent } from '../ecs/components/TransformComponent';
import { VELOCITY } from '../ecs/components/VelocityComponent';
import type { VelocityComponent } from '../ecs/components/VelocityComponent';
import { ANIMAL } from '../ecs/components/AnimalComponent';
import type { AnimalComponent, AnimalType, AnimalState } from '../ecs/components/AnimalComponent';
import type { TimeSystem } from './TimeSystem';
import type { TerrainData } from '../terrain/TerrainGenerator';
import { sampleTerrainHeight } from '../terrain/TerrainGenerator';

const DEFAULT_MAP_HALF_SIZE = 128;
const SHEEP_FLOCK_RADIUS = 10;
const SHEEP_SEPARATION_RADIUS = 3;
const SHEEP_ALIGNMENT_WEIGHT = 0.5;
const SHEEP_COHESION_WEIGHT = 0.5;
const SHEEP_SEPARATION_WEIGHT = 1.5;
const SHEEP_TARGET_WEIGHT = 0.3;
const SHEEP_MAX_SPEED = 3;
const SHEEP_WANDER_SPEED = 2;

const CHICKEN_WANDER_SPEED = 2;
const CHICKEN_PECK_INTERVAL = 3;
const CHICKEN_PECK_DURATION = 0.5;

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

function vec3Length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vector3): Vector3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function getRandomWanderTarget(pos: Vector3, radius: number, halfSize: number): Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * radius;
  let x = pos.x + Math.cos(angle) * dist;
  let z = pos.z + Math.sin(angle) * dist;
  x = Math.max(-halfSize + 5, Math.min(halfSize - 5, x));
  z = Math.max(-halfSize + 5, Math.min(halfSize - 5, z));
  return { x, y: 0, z };
}

export class AnimalAISystem extends System {
  private mapHalfSize = DEFAULT_MAP_HALF_SIZE;
  private terrainData: TerrainData | null = null;
  private centerPosition = { x: 0, y: 0, z: 0 };

  constructor(private timeSystem: TimeSystem) {
    super('AnimalAISystem');
  }

  setMapSize(halfSize: number): void {
    this.mapHalfSize = halfSize;
  }

  setTerrainData(data: TerrainData): void {
    this.terrainData = data;
  }

  setCenterPosition(pos: { x: number; y: number; z: number }): void {
    this.centerPosition = pos;
  }

  update(world: World, dt: number): void {
    const scaledDt = this.timeSystem.getScaledDt(dt);
    if (scaledDt <= 0) return;

    const entities = world.query(TRANSFORM, VELOCITY, ANIMAL);
    const animals = new Map<number, { transform: TransformComponent; velocity: VelocityComponent; animal: AnimalComponent }>();

    for (const entityId of entities) {
      const transform = world.getComponent<TransformComponent>(entityId, TRANSFORM)!;
      const velocity = world.getComponent<VelocityComponent>(entityId, VELOCITY)!;
      const animal = world.getComponent<AnimalComponent>(entityId, ANIMAL)!;
      animals.set(entityId, { transform, velocity, animal });
    }

    for (const [entityId, { transform, velocity, animal }] of animals) {
      if (animal.type === 'sheep') {
        this.updateSheep(transform, velocity, animal, animals, scaledDt);
      } else if (animal.type === 'chicken') {
        this.updateChicken(transform, velocity, animal, scaledDt);
      }
    }
  }

  private updateSheep(
    transform: TransformComponent,
    velocity: VelocityComponent,
    animal: AnimalComponent,
    allAnimals: Map<number, { transform: TransformComponent; velocity: VelocityComponent; animal: AnimalComponent }>,
    dt: number,
  ): void {
    const pos = transform.position;

    if (!animal.targetPosition || vec3Distance(pos, animal.targetPosition) < 2) {
      animal.targetPosition = getRandomWanderTarget(pos, 15, this.mapHalfSize);
    }

    const flockCenter = this.calculateFlocking(pos, animal, allAnimals);

    const toTarget = animal.targetPosition
      ? vec3Normalize(vec3Sub(animal.targetPosition, pos))
      : { x: 0, y: 0, z: 0 };

    const distFromCenter = vec3Distance(pos, this.centerPosition);
    let avoidCenter = { x: 0, y: 0, z: 0 };
    if (distFromCenter > this.mapHalfSize * 0.8) {
      const away = vec3Normalize(vec3Sub(pos, this.centerPosition));
      avoidCenter = vec3Scale(away, 2);
    }

    const steering = { x: 0, y: 0, z: 0 };
    steering.x += flockCenter.x * SHEEP_COHESION_WEIGHT;
    steering.z += flockCenter.z * SHEEP_COHESION_WEIGHT;
    steering.x += animal.flocking.alignment.x * SHEEP_ALIGNMENT_WEIGHT;
    steering.z += animal.flocking.alignment.z * SHEEP_ALIGNMENT_WEIGHT;
    steering.x += animal.flocking.separation.x * SHEEP_SEPARATION_WEIGHT;
    steering.z += animal.flocking.separation.z * SHEEP_SEPARATION_WEIGHT;
    steering.x += toTarget.x * SHEEP_TARGET_WEIGHT;
    steering.z += toTarget.z * SHEEP_TARGET_WEIGHT;
    steering.x += avoidCenter.x;
    steering.z += avoidCenter.z;

    const desiredSpeed = animal.targetPosition ? SHEEP_WANDER_SPEED : SHEEP_MAX_SPEED;
    const currentSpeed = vec3Length(velocity.velocity);
    
    if (currentSpeed > 0) {
      const heading = vec3Normalize(velocity.velocity);
      const newVel = vec3Add(vec3Scale(heading, currentSpeed * 0.95), vec3Scale(steering, dt * 5));
      const newSpeed = Math.min(vec3Length(newVel), desiredSpeed);
      const normalized = vec3Normalize(newVel);
      velocity.velocity.x = normalized.x * newSpeed;
      velocity.velocity.y = 0;
      velocity.velocity.z = normalized.z * newSpeed;
    } else {
      const normalized = vec3Normalize(steering);
      velocity.velocity.x = normalized.x * desiredSpeed;
      velocity.velocity.y = 0;
      velocity.velocity.z = normalized.z * desiredSpeed;
    }

    if (this.terrainData) {
      transform.position.y = sampleTerrainHeight(this.terrainData, transform.position.x, transform.position.z);
    }
  }

  private calculateFlocking(
    pos: Vector3,
    animal: AnimalComponent,
    allAnimals: Map<number, { transform: TransformComponent; velocity: VelocityComponent; animal: AnimalComponent }>,
  ): Vector3 {
    let alignmentX = 0, alignmentZ = 0;
    let cohesionX = 0, cohesionZ = 0;
    let separationX = 0, separationZ = 0;
    let neighborCount = 0;

    for (const [, other] of allAnimals) {
      if (other.animal.type !== 'sheep') continue;
      const otherPos = other.transform.position;
      const dist = vec3Distance(pos, otherPos);

      if (dist > 0 && dist < SHEEP_FLOCK_RADIUS) {
        alignmentX += other.velocity.velocity.x;
        alignmentZ += other.velocity.velocity.z;
        cohesionX += otherPos.x;
        cohesionZ += otherPos.z;
        neighborCount++;

        if (dist < SHEEP_SEPARATION_RADIUS) {
          const away = vec3Normalize(vec3Sub(pos, otherPos));
          separationX += away.x / dist;
          separationZ += away.z / dist;
        }
      }
    }

    animal.flocking.neighbors = neighborCount;

    if (neighborCount > 0) {
      alignmentX /= neighborCount;
      alignmentZ /= neighborCount;
      cohesionX = (cohesionX / neighborCount) - pos.x;
      cohesionZ = (cohesionZ / neighborCount) - pos.z;
    }

    animal.flocking.alignment = { x: alignmentX, y: 0, z: alignmentZ };
    animal.flocking.cohesion = { x: cohesionX, y: 0, z: cohesionZ };
    animal.flocking.separation = { x: separationX, y: 0, z: separationZ };

    return { x: cohesionX + alignmentX + separationX, y: 0, z: cohesionZ + alignmentZ + separationZ };
  }

  private updateChicken(
    transform: TransformComponent,
    velocity: VelocityComponent,
    animal: AnimalComponent,
    dt: number,
  ): void {
    const pos = transform.position;

    animal.stateTimer += dt;

    if (animal.state === 'pecking') {
      velocity.velocity.x = 0;
      velocity.velocity.y = 0;
      velocity.velocity.z = 0;

      if (animal.stateTimer >= CHICKEN_PECK_DURATION) {
        animal.state = 'wandering';
        animal.stateTimer = 0;
        animal.targetPosition = getRandomWanderTarget(pos, 10, this.mapHalfSize);
      }
    } else {
      if (!animal.targetPosition || vec3Distance(pos, animal.targetPosition) < 1.5) {
        animal.targetPosition = getRandomWanderTarget(pos, 10, this.mapHalfSize);
      }

      if (animal.stateTimer >= CHICKEN_PECK_INTERVAL) {
        animal.state = 'pecking';
        animal.stateTimer = 0;
        return;
      }

      const toTarget = vec3Normalize(vec3Sub(animal.targetPosition, pos));
      velocity.velocity.x = toTarget.x * CHICKEN_WANDER_SPEED;
      velocity.velocity.y = 0;
      velocity.velocity.z = toTarget.z * CHICKEN_WANDER_SPEED;
    }

    if (this.terrainData) {
      transform.position.y = sampleTerrainHeight(this.terrainData, transform.position.x, transform.position.z);
    }
  }
}
