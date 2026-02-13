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

  // Gathering animation state
  private isGathering = false;
  private gatherType: 'chop' | 'mine' = 'mine';
  private gatherPhase = 0;     // phase within a single swing cycle (0 to 1)
  private hitInterval = 0;     // seconds per hit
  private toolMesh: THREE.Object3D | null = null;

  constructor(private mesh: THREE.Group) {
    // Find named pivot groups
    this.leftArm = mesh.getObjectByName('leftArm') ?? null;
    this.rightArm = mesh.getObjectByName('rightArm') ?? null;
    this.leftLeg = mesh.getObjectByName('leftLeg') ?? null;
    this.rightLeg = mesh.getObjectByName('rightLeg') ?? null;
  }

  /** Start gathering animation with tool attached to right hand. */
  startGathering(hitInterval: number, toolMesh: THREE.Group, gatherType: 'chop' | 'mine' = 'mine'): void {
    this.isGathering = true;
    this.gatherType = gatherType;
    this.hitInterval = hitInterval;
    this.gatherPhase = 0;
    this.toolMesh = toolMesh;

    // Attach tool to right arm group near the hand position
    if (this.rightArm) {
      if (gatherType === 'chop') {
        toolMesh.position.set(0, -0.37, 0);
        // For chopping, rotate the axe so the blade face points toward the tree.
        // rotation.x = -PI/2 tilts the blade toward the tree (compensates for arm
        // extending forward via rotation.x = -PI/2), rotation.y = PI/2 orients the
        // blade face perpendicular to the horizontal sweep direction.
        toolMesh.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
      } else {
        // For mining, flip pickaxe 180° and shift down to compensate
        // for the handle length so the grip stays near the hand.
        toolMesh.position.set(0, -0.72, 0);
        toolMesh.rotation.set(Math.PI, 0, Math.PI / 2);
      }
      this.rightArm.add(toolMesh);
    }
  }

  /** Stop gathering animation, remove and return the tool mesh. */
  stopGathering(): void {
    this.isGathering = false;
    this.gatherPhase = 0;

    // Remove tool mesh from arm
    if (this.toolMesh && this.rightArm) {
      this.rightArm.remove(this.toolMesh);
    }
    this.toolMesh = null;

    // Reset arm rotations (both x and z axes)
    if (this.rightArm) {
      this.rightArm.rotation.x = 0;
      this.rightArm.rotation.z = 0;
    }
    if (this.leftArm) this.leftArm.rotation.x = 0;
  }

  /** Reset the gather swing phase (called on each GatherHit to sync animation). */
  resetGatherPhase(): void {
    this.gatherPhase = 0;
  }

  /** Set facing direction toward a target. */
  setFacingTarget(dx: number, dz: number): void {
    this.targetYRotation = Math.atan2(dx, dz);
  }

  /** Check if currently in gathering animation mode. */
  isInGatheringMode(): boolean {
    return this.isGathering;
  }

  /**
   * Call every frame.
   * @param dt - delta time in seconds
   * @param vx - velocity X component
   * @param vz - velocity Z component
   */
  update(dt: number, vx: number, vz: number): void {
    if (this.isGathering) {
      if (this.gatherType === 'chop') {
        this.updateChopGathering(dt);
      } else {
        this.updateMineGathering(dt);
      }
    } else {
      this.updateWalkIdle(dt, vx, vz);
    }

    // Smooth Y rotation toward target
    let angleDiff = this.targetYRotation - this.mesh.rotation.y;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    this.mesh.rotation.y += angleDiff * Math.min(1, ROTATION_LERP_SPEED * dt);
  }

  /** Walk/idle animation (original behavior). */
  private updateWalkIdle(dt: number, vx: number, vz: number): void {
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
  }

  /** Mining animation — vertical up/down motion on the right arm (original behavior). */
  private updateMineGathering(dt: number): void {
    // Lerp legs to rest (standing still while gathering)
    const legT = Math.min(1, IDLE_LERP_SPEED * dt);
    if (this.leftLeg) this.leftLeg.rotation.x *= (1 - legT);
    if (this.rightLeg) this.rightLeg.rotation.x *= (1 - legT);

    // Left arm slightly raised (bracing posture)
    if (this.leftArm) {
      const targetLeftArm = -0.3;
      this.leftArm.rotation.x += (targetLeftArm - this.leftArm.rotation.x) * Math.min(1, 6 * dt);
    }

    // Advance gather phase
    if (this.hitInterval > 0) {
      this.gatherPhase += dt / this.hitInterval;
      if (this.gatherPhase >= 1) {
        this.gatherPhase -= Math.floor(this.gatherPhase);
      }
    }

    // Map phase to arm rotation for mining motion (vertical swing)
    let armRotation: number;
    if (this.gatherPhase < 0.4) {
      // Phase 0–0.4: arm raises up (rotation.x from 0 to -1.5 radians — back/up)
      const t = this.gatherPhase / 0.4;
      armRotation = -1.5 * t;
    } else if (this.gatherPhase < 0.6) {
      // Phase 0.4–0.6: arm swings down fast (rotation.x from -1.5 to 0.5 — forward/down)
      const t = (this.gatherPhase - 0.4) / 0.2;
      armRotation = -1.5 + 2.0 * t;
    } else {
      // Phase 0.6–1.0: arm holds/recovers (rotation.x lerps back toward 0)
      const t = (this.gatherPhase - 0.6) / 0.4;
      armRotation = 0.5 * (1 - t);
    }

    if (this.rightArm) {
      this.rightArm.rotation.x = armRotation;
    }
  }

  /** Chopping animation — horizontal lateral swing on the right arm for wood cutting. */
  private updateChopGathering(dt: number): void {
    // Lerp legs to rest (standing still while gathering)
    const legT = Math.min(1, IDLE_LERP_SPEED * dt);
    if (this.leftLeg) this.leftLeg.rotation.x *= (1 - legT);
    if (this.rightLeg) this.rightLeg.rotation.x *= (1 - legT);

    // Left arm slightly raised (bracing posture)
    if (this.leftArm) {
      const targetLeftArm = -0.3;
      this.leftArm.rotation.x += (targetLeftArm - this.leftArm.rotation.x) * Math.min(1, 6 * dt);
    }

    // Advance gather phase
    if (this.hitInterval > 0) {
      this.gatherPhase += dt / this.hitInterval;
      if (this.gatherPhase >= 1) {
        this.gatherPhase -= Math.floor(this.gatherPhase);
      }
    }

    // Map phase to arm rotation for HORIZONTAL chopping motion.
    // KEY: extend arm FORWARD first (rotation.x = -PI/2 makes arm horizontal),
    // then sweep with rotation.z which creates a HORIZONTAL arc at trunk height.
    let armExtend: number;  // rotation.x: 0 = hanging, -PI/2 = extended forward/horizontal
    let lateralSwing: number;  // rotation.z: positive = right, negative = left
    if (this.gatherPhase < 0.4) {
      // Wind-up: arm extends forward and pulls to the right
      const t = this.gatherPhase / 0.4;
      armExtend = -Math.PI / 2 * t;       // 0 → -PI/2 (arm becomes horizontal)
      lateralSwing = 0.8 * t;             // 0 → +0.8 (arm pulls right)
    } else if (this.gatherPhase < 0.6) {
      // Strike: arm stays horizontal, sweeps LEFT through tree
      const t = (this.gatherPhase - 0.4) / 0.2;
      armExtend = -Math.PI / 2;           // stays horizontal
      lateralSwing = 0.8 - 1.1 * t;      // +0.8 → -0.3 (sweeps left)
    } else {
      // Recover: arm drops back to rest, sweep returns to center
      const t = (this.gatherPhase - 0.6) / 0.4;
      armExtend = -Math.PI / 2 * (1 - t); // -PI/2 → 0 (arm drops)
      lateralSwing = -0.3 * (1 - t);      // -0.3 → 0 (returns center)
    }

    if (this.rightArm) {
      this.rightArm.rotation.x = armExtend;
      this.rightArm.rotation.z = lateralSwing;
    }
  }
}

