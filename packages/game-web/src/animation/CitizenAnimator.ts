import * as THREE from 'three';

// Animation constants
const SWING_AMPLITUDE = 0.5;   // max rotation in radians at full speed
const SWING_FREQUENCY = 8.0;   // radians per second
const IDLE_LERP_SPEED = 8.0;   // how fast limbs return to rest
const ROTATION_LERP_SPEED = 8.0; // how fast facing direction changes
const SPEED_THRESHOLD = 0.05;  // below this, consider idle

export class CitizenAnimator {
  private leftArm: THREE.Object3D | null;
  private rightArm: THREE.Object3D | null;
  private leftLeg: THREE.Object3D | null;
  private rightLeg: THREE.Object3D | null;
  private phase = 0;           // walk cycle phase accumulator
  private targetYRotation = 0; // target facing direction

  constructor(private mesh: THREE.Group) {
    // Find named pivot groups
    this.leftArm = mesh.getObjectByName('leftArm') ?? null;
    this.rightArm = mesh.getObjectByName('rightArm') ?? null;
    this.leftLeg = mesh.getObjectByName('leftLeg') ?? null;
    this.rightLeg = mesh.getObjectByName('rightLeg') ?? null;
  }

  /**
   * Call every frame.
   * @param dt - delta time in seconds
   * @param vx - velocity X component
   * @param vz - velocity Z component
   */
  update(dt: number, vx: number, vz: number): void {
    const speed = Math.sqrt(vx * vx + vz * vz);

    if (speed > SPEED_THRESHOLD) {
      // Advance walk cycle phase
      this.phase += SWING_FREQUENCY * dt;

      // Calculate swing based on speed (normalize to some max speed, e.g. 3)
      const normalizedSpeed = Math.min(speed / 3.0, 1.0);
      const swing = Math.sin(this.phase) * SWING_AMPLITUDE * normalizedSpeed;

      // Arms swing OPPOSITE to legs for natural walk
      // Left arm + right leg swing together, right arm + left leg swing together
      if (this.leftArm) this.leftArm.rotation.x = swing;      // left arm forward
      if (this.rightArm) this.rightArm.rotation.x = -swing;   // right arm backward
      if (this.leftLeg) this.leftLeg.rotation.x = -swing;     // left leg backward
      if (this.rightLeg) this.rightLeg.rotation.x = swing;    // right leg forward

      // Update facing direction (Y rotation)
      this.targetYRotation = Math.atan2(vx, vz);
    } else {
      // Idle: lerp limbs back to rest
      const t = Math.min(1, IDLE_LERP_SPEED * dt);
      if (this.leftArm) this.leftArm.rotation.x *= (1 - t);
      if (this.rightArm) this.rightArm.rotation.x *= (1 - t);
      if (this.leftLeg) this.leftLeg.rotation.x *= (1 - t);
      if (this.rightLeg) this.rightLeg.rotation.x *= (1 - t);
      // Reset phase so walk starts fresh next time
      this.phase = 0;
    }

    // Smooth Y rotation toward target
    let angleDiff = this.targetYRotation - this.mesh.rotation.y;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    this.mesh.rotation.y += angleDiff * Math.min(1, ROTATION_LERP_SPEED * dt);
  }
}

