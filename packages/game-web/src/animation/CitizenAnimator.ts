import * as THREE from 'three';

// Animation constants
const SWING_AMPLITUDE = 0.5;   // max rotation in radians at full speed
const SWING_FREQUENCY = 8.0;   // radians per second
const IDLE_LERP_SPEED = 8.0;   // how fast limbs return to rest
const ROTATION_LERP_SPEED = 8.0; // how fast facing direction changes
const SPEED_THRESHOLD = 0.05;  // below this, consider idle

// Enhanced animation constants
const BREATHE_SPEED = Math.PI;       // ~2 second full cycle (PI rad/s → period = 2s)
const BREATHE_MIN_SCALE = 0.98;      // body Y-scale at exhale
const BREATHE_MAX_SCALE = 1.02;      // body Y-scale at inhale
const WALK_BOUNCE_AMPLITUDE = 0.02;  // vertical bounce height during walk
const HEAD_BOB_AMPLITUDE = 0.015;    // head vertical bob during walk
const WALK_LEAN_ANGLE = 0.05;        // forward lean in radians during walk
const BLEND_SPEED = 6.0;             // how fast new animations blend in/out

export class CitizenAnimator {
  private leftArm: THREE.Object3D | null;
  private rightArm: THREE.Object3D | null;
  private leftLeg: THREE.Object3D | null;
  private rightLeg: THREE.Object3D | null;
  private headGroup: THREE.Object3D | null;
  private bodyGroup: THREE.Object3D | null;
  private phase = 0;           // walk cycle phase accumulator
  private breathePhase = 0;    // idle breathing phase accumulator
  private targetYRotation = 0; // target facing direction

  // Blend factor: 0 = fully idle, 1 = fully walking
  private walkBlend = 0;

  // Store base positions for additive offsets
  private headBaseY = 0;

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

    // Optional sub-groups for enhanced animations (gracefully handle if not found)
    this.headGroup = mesh.getObjectByName('headGroup') ?? null;
    this.bodyGroup = mesh.getObjectByName('bodyGroup') ?? null;

    // Store base head Y position for additive bob
    if (this.headGroup) {
      this.headBaseY = this.headGroup.position.y;
    }
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
        toolMesh.rotation.set(Math.PI, Math.PI / 2, 0);
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

    // Reset enhanced animation state for clean transition back to idle
    if (this.bodyGroup) {
      this.bodyGroup.scale.y = 1;
      this.bodyGroup.rotation.x = 0;
    }
    if (this.headGroup) {
      this.headGroup.position.y = this.headBaseY;
    }
    this.walkBlend = 0;
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

  /** Walk/idle animation with enhanced breathing, bounce, head bob, and body lean. */
  private updateWalkIdle(dt: number, vx: number, vz: number): void {
    const speed = Math.sqrt(vx * vx + vz * vz);
    const isWalking = speed > SPEED_THRESHOLD;

    // Smoothly blend walkBlend toward 0 (idle) or 1 (walking)
    const targetBlend = isWalking ? 1 : 0;
    this.walkBlend += (targetBlend - this.walkBlend) * Math.min(1, BLEND_SPEED * dt);

    // Always advance breathing phase (it fades out via walkBlend)
    this.breathePhase += BREATHE_SPEED * dt;

    if (isWalking) {
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

    // --- Enhanced animations (additive, blended) ---

    // 1. Idle breathing: subtle Y-scale oscillation on bodyGroup
    //    Fades out as walkBlend approaches 1 (walking)
    if (this.bodyGroup) {
      const breatheFactor = 1 - this.walkBlend; // full at idle, zero at walk
      const breatheT = (Math.sin(this.breathePhase) + 1) * 0.5; // 0..1
      const breatheScale = BREATHE_MIN_SCALE + (BREATHE_MAX_SCALE - BREATHE_MIN_SCALE) * breatheT;
      // Lerp body scale.y toward target (blend between 1.0 and breatheScale)
      const targetScaleY = 1.0 + (breatheScale - 1.0) * breatheFactor;
      this.bodyGroup.scale.y += (targetScaleY - this.bodyGroup.scale.y) * Math.min(1, BLEND_SPEED * dt);
    }

    // 2. Walk bounce: slight vertical offset on the whole mesh synced to walk cycle
    //    Uses abs(sin) for a double-frequency bounce (one per step)
    //    Fades in as walkBlend approaches 1
    {
      const bounceOffset = Math.abs(Math.sin(this.phase)) * WALK_BOUNCE_AMPLITUDE * this.walkBlend;
      this.mesh.position.y += bounceOffset;
    }

    // 3. Head bob: subtle vertical oscillation on headGroup during walking
    //    Synced to walk cycle but at double frequency for per-step bob
    if (this.headGroup) {
      const headBob = Math.sin(this.phase * 2) * HEAD_BOB_AMPLITUDE * this.walkBlend;
      this.headGroup.position.y = this.headBaseY + headBob;
    }

    // 4. Body lean forward during walking (small rotation.x on bodyGroup)
    //    Smoothly blends in/out with walkBlend
    if (this.bodyGroup) {
      const targetLean = WALK_LEAN_ANGLE * this.walkBlend;
      this.bodyGroup.rotation.x += (targetLean - this.bodyGroup.rotation.x) * Math.min(1, BLEND_SPEED * dt);
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
      // Phase 0–0.4: arm raises up (rotation.x from -0.3 to -1.5 radians — back/up)
      const t = this.gatherPhase / 0.4;
      armRotation = -0.3 - 1.2 * t;
    } else if (this.gatherPhase < 0.6) {
      // Phase 0.4–0.6: arm swings down fast (rotation.x from -1.5 to -0.2 — stops above rock)
      const t = (this.gatherPhase - 0.4) / 0.2;
      armRotation = -1.5 + 1.3 * t;
    } else {
      // Phase 0.6–1.0: arm holds/recovers (rotation.x lerps from -0.2 back to -0.3)
      const t = (this.gatherPhase - 0.6) / 0.4;
      armRotation = -0.2 - 0.1 * t;
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

