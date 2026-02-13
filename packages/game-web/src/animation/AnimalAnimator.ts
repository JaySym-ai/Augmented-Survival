import * as THREE from 'three';

export type AnimalType = 'sheep' | 'chicken';

interface AnimalConfig {
  legNames: string[];
  swingAmplitude: number;
  swingFrequency: number;
  idleLerpSpeed: number;
  speedThreshold: number;
  walkSpeed: number;
}

const ANIMAL_CONFIGS: Record<AnimalType, AnimalConfig> = {
  sheep: {
    legNames: ['legFL', 'legFR', 'legBL', 'legBR'],
    swingAmplitude: 0.4,
    swingFrequency: 6.0,
    idleLerpSpeed: 8.0,
    speedThreshold: 0.05,
    walkSpeed: 2.0,
  },
  chicken: {
    legNames: ['legL', 'legR'],
    swingAmplitude: 0.6,
    swingFrequency: 10.0,
    idleLerpSpeed: 8.0,
    speedThreshold: 0.05,
    walkSpeed: 1.5,
  },
};

export class AnimalAnimator {
  private legs: THREE.Object3D[] = [];
  private phase = 0;
  private targetYRotation = 0;
  private config: AnimalConfig;

  constructor(private mesh: THREE.Group, animalType: AnimalType) {
    this.config = ANIMAL_CONFIGS[animalType];
    for (const name of this.config.legNames) {
      const leg = mesh.getObjectByName(name);
      if (leg) {
        this.legs.push(leg);
      }
    }
  }

  setFacingTarget(dx: number, dz: number): void {
    this.targetYRotation = Math.atan2(dx, dz);
  }

  update(dt: number, vx: number, vz: number): void {
    const speed = Math.sqrt(vx * vx + vz * vz);

    if (speed > this.config.speedThreshold) {
      this.phase += this.config.swingFrequency * dt;

      const normalizedSpeed = Math.min(speed / this.config.walkSpeed, 1.0);
      const swing = Math.sin(this.phase) * this.config.swingAmplitude * normalizedSpeed;

      for (let i = 0; i < this.legs.length; i++) {
        const legPhase = (i === 0 || i === 3) ? swing : -swing;
        this.legs[i].rotation.x = legPhase;
      }

      this.targetYRotation = Math.atan2(vx, vz);
    } else {
      const t = Math.min(1, this.config.idleLerpSpeed * dt);
      for (const leg of this.legs) {
        leg.rotation.x *= 1 - t;
      }
      this.phase = 0;
    }

    let angleDiff = this.targetYRotation - this.mesh.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    this.mesh.rotation.y += angleDiff * Math.min(1, 8 * dt);
  }
}
