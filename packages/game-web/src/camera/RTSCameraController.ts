/**
 * RTSCameraController — Full RTS camera with pan/zoom/rotate, smooth damping, touch support
 */
import * as THREE from 'three';

export interface RTSCameraConfig {
  fov: number;
  tiltAngle: number;         // degrees, default ~45
  minDistance: number;        // min zoom distance
  maxDistance: number;        // max zoom distance
  initialDistance: number;
  panSpeed: number;
  rotateSpeed: number;
  zoomSpeed: number;
  smoothing: number;          // 0-1, higher = smoother (slower)
  edgeScrollEnabled: boolean;
  edgeScrollThreshold: number; // pixels from edge
  edgeScrollSpeed: number;
  minY: number;               // minimum camera Y height
  boundarySize: number;       // world boundary limit
}

const DEFAULT_CONFIG: RTSCameraConfig = {
  fov: 50,
  tiltAngle: 45,
  minDistance: 10,
  maxDistance: 200,
  initialDistance: 60,
  panSpeed: 50,
  rotateSpeed: 2,
  zoomSpeed: 8,
  smoothing: 0.1,
  edgeScrollEnabled: false,
  edgeScrollThreshold: 30,
  edgeScrollSpeed: 40,
  minY: 5,
  boundarySize: 200,
};

export class RTSCameraController {
  public readonly camera: THREE.PerspectiveCamera;
  public readonly config: RTSCameraConfig;

  // Target values (input drives these, camera lerps toward them)
  private targetPosition = new THREE.Vector3(0, 0, 0); // look-at point on ground
  private targetRotation = 0;   // orbit angle in radians
  private targetDistance: number;

  // Current smooth values
  private currentPosition = new THREE.Vector3(0, 0, 0);
  private currentRotation = 0;
  private currentDistance: number;

  // Input state
  private keys = new Set<string>();
  private mousePosition = new THREE.Vector2(0, 0);
  private isMiddleMouseDown = false;
  private isRightMouseDown = false;
  private lastMousePosition = new THREE.Vector2(0, 0);
  private containerWidth = 0;
  private containerHeight = 0;

  // Touch state
  private touches: Map<number, THREE.Vector2> = new Map();
  private lastTouchDistance = 0;
  private lastTouchAngle = 0;
  private lastTouchCenter = new THREE.Vector2();

  // Pan animation state
  private panAnimation: { from: THREE.Vector3; to: THREE.Vector3; elapsed: number; duration: number } | null = null;

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Bound handlers (for cleanup)
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnContextMenu: (e: Event) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;

  constructor(
    private container: HTMLElement,
    config: Partial<RTSCameraConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.camera = new THREE.PerspectiveCamera(
      this.config.fov,
      container.clientWidth / container.clientHeight,
      0.5,
      1000,
    );

    this.targetDistance = this.config.initialDistance;
    this.currentDistance = this.config.initialDistance;

    this.updateCameraPosition();

    // Bind all event handlers
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnContextMenu = (e: Event) => e.preventDefault();
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);

    this.attachEvents();
    this.onResize();
  }

  private attachEvents(): void {
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
    this.container.addEventListener('mousemove', this.boundOnMouseMove);
    this.container.addEventListener('mousedown', this.boundOnMouseDown);
    window.addEventListener('mouseup', this.boundOnMouseUp);
    this.container.addEventListener('wheel', this.boundOnWheel, { passive: false });
    this.container.addEventListener('contextmenu', this.boundOnContextMenu);
    this.container.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.boundOnTouchEnd);
  }

  // ---- Input Handlers ----
  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    this.panAnimation = null; // cancel pan animation on keyboard input
  }
  private onKeyUp(e: KeyboardEvent): void { this.keys.delete(e.key.toLowerCase()); }

  private onMouseMove(e: MouseEvent): void {
    this.mousePosition.set(e.clientX, e.clientY);

    if (this.isMiddleMouseDown) {
      const dx = e.clientX - this.lastMousePosition.x;
      const dy = e.clientY - this.lastMousePosition.y;
      this.panByScreenDelta(dx, dy);
      this.panAnimation = null; // cancel pan animation on mouse drag
    }

    if (this.isRightMouseDown) {
      const dx = e.clientX - this.lastMousePosition.x;
      this.targetRotation += dx * 0.005 * this.config.rotateSpeed;
    }

    this.lastMousePosition.set(e.clientX, e.clientY);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 1) this.isMiddleMouseDown = true; // middle
    if (e.button === 2) this.isRightMouseDown = true;  // right
    this.lastMousePosition.set(e.clientX, e.clientY);
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 1) this.isMiddleMouseDown = false;
    if (e.button === 2) this.isRightMouseDown = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.panAnimation = null; // cancel pan animation on scroll
    const delta = Math.sign(e.deltaY) * this.config.zoomSpeed;
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance + delta,
      this.config.minDistance,
      this.config.maxDistance,
    );
  }

  // ---- Touch Handlers ----
  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.touches.set(t.identifier, new THREE.Vector2(t.clientX, t.clientY));
    }
    if (this.touches.size === 2) {
      this.updateTouchReference();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    this.panAnimation = null; // cancel pan animation on touch
    if (this.touches.size === 1) {
      // Single finger: pan
      const t = e.changedTouches[0];
      const prev = this.touches.get(t.identifier);
      if (prev) {
        const dx = t.clientX - prev.x;
        const dy = t.clientY - prev.y;
        this.panByScreenDelta(dx, dy);
        prev.set(t.clientX, t.clientY);
      }
    } else if (this.touches.size === 2) {
      // Two fingers: pinch zoom + rotate
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const prev = this.touches.get(t.identifier);
        if (prev) prev.set(t.clientX, t.clientY);
      }

      const touchArr = Array.from(this.touches.values());
      const dist = touchArr[0].distanceTo(touchArr[1]);
      const center = new THREE.Vector2().addVectors(touchArr[0], touchArr[1]).multiplyScalar(0.5);
      const angle = Math.atan2(touchArr[1].y - touchArr[0].y, touchArr[1].x - touchArr[0].x);

      // Zoom
      if (this.lastTouchDistance > 0) {
        const zoomDelta = (this.lastTouchDistance - dist) * 0.1;
        this.targetDistance = THREE.MathUtils.clamp(
          this.targetDistance + zoomDelta,
          this.config.minDistance,
          this.config.maxDistance,
        );
      }

      // Rotate
      if (this.lastTouchAngle !== 0) {
        const rotDelta = angle - this.lastTouchAngle;
        this.targetRotation += rotDelta;
      }

      this.lastTouchDistance = dist;
      this.lastTouchAngle = angle;
      this.lastTouchCenter.copy(center);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touches.delete(e.changedTouches[i].identifier);
    }
    if (this.touches.size < 2) {
      this.lastTouchDistance = 0;
      this.lastTouchAngle = 0;
    }
  }

  private updateTouchReference(): void {
    const touchArr = Array.from(this.touches.values());
    if (touchArr.length >= 2) {
      this.lastTouchDistance = touchArr[0].distanceTo(touchArr[1]);
      this.lastTouchAngle = Math.atan2(touchArr[1].y - touchArr[0].y, touchArr[1].x - touchArr[0].x);
      this.lastTouchCenter.addVectors(touchArr[0], touchArr[1]).multiplyScalar(0.5);
    }
  }

  // ---- Pan Helper ----
  private panByScreenDelta(dx: number, dy: number): void {
    const panScale = this.currentDistance * 0.002;
    const sinR = Math.sin(this.currentRotation);
    const cosR = Math.cos(this.currentRotation);

    // Convert screen delta to world delta
    this.targetPosition.x -= (dx * cosR + dy * sinR) * panScale;
    this.targetPosition.z -= (-dx * sinR + dy * cosR) * panScale;
  }

  // ---- Update (call each frame) ----
  update(dt: number): void {
    const smoothFactor = 1 - Math.pow(this.config.smoothing, dt * 60);

    // Keyboard pan
    const panAmount = this.config.panSpeed * dt;
    const sinR = Math.sin(this.currentRotation);
    const cosR = Math.cos(this.currentRotation);

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this.targetPosition.x -= sinR * panAmount;
      this.targetPosition.z -= cosR * panAmount;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this.targetPosition.x += sinR * panAmount;
      this.targetPosition.z += cosR * panAmount;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.targetPosition.x -= cosR * panAmount;
      this.targetPosition.z += sinR * panAmount;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.targetPosition.x += cosR * panAmount;
      this.targetPosition.z -= sinR * panAmount;
    }

    // Keyboard rotate
    if (this.keys.has('q')) this.targetRotation -= this.config.rotateSpeed * dt;
    if (this.keys.has('e')) this.targetRotation += this.config.rotateSpeed * dt;

    // Edge scroll
    if (this.config.edgeScrollEnabled && !this.isMiddleMouseDown) {
      const threshold = this.config.edgeScrollThreshold;
      const edgeSpeed = this.config.edgeScrollSpeed * dt;

      if (this.mousePosition.x < threshold) {
        this.targetPosition.x -= cosR * edgeSpeed;
        this.targetPosition.z += sinR * edgeSpeed;
      }
      if (this.mousePosition.x > this.containerWidth - threshold) {
        this.targetPosition.x += cosR * edgeSpeed;
        this.targetPosition.z -= sinR * edgeSpeed;
      }
      if (this.mousePosition.y < threshold) {
        this.targetPosition.x -= sinR * edgeSpeed;
        this.targetPosition.z -= cosR * edgeSpeed;
      }
      if (this.mousePosition.y > this.containerHeight - threshold) {
        this.targetPosition.x += sinR * edgeSpeed;
        this.targetPosition.z += cosR * edgeSpeed;
      }
    }

    // Clamp to boundaries
    const b = this.config.boundarySize;
    this.targetPosition.x = THREE.MathUtils.clamp(this.targetPosition.x, -b, b);
    this.targetPosition.z = THREE.MathUtils.clamp(this.targetPosition.z, -b, b);

    // Pan animation (overrides normal position smoothing while active)
    if (this.panAnimation) {
      this.panAnimation.elapsed += dt;
      const t = THREE.MathUtils.clamp(this.panAnimation.elapsed / this.panAnimation.duration, 0, 1);
      // Ease-in-out quadratic
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.currentPosition.lerpVectors(this.panAnimation.from, this.panAnimation.to, eased);
      if (t >= 1) {
        this.panAnimation = null;
      }
    } else {
      // Normal smooth interpolation for position
      this.currentPosition.lerp(this.targetPosition, smoothFactor);
    }

    // Smooth interpolation for rotation and distance (always active)
    this.currentRotation = THREE.MathUtils.lerp(this.currentRotation, this.targetRotation, smoothFactor);
    this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, this.targetDistance, smoothFactor);

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const tiltRad = THREE.MathUtils.degToRad(this.config.tiltAngle);

    // Camera orbits around currentPosition at currentDistance
    const offsetX = Math.sin(this.currentRotation) * Math.cos(tiltRad) * this.currentDistance;
    const offsetY = Math.sin(tiltRad) * this.currentDistance;
    const offsetZ = Math.cos(this.currentRotation) * Math.cos(tiltRad) * this.currentDistance;

    this.camera.position.set(
      this.currentPosition.x + offsetX,
      Math.max(this.config.minY, this.currentPosition.y + offsetY),
      this.currentPosition.z + offsetZ,
    );

    this.camera.lookAt(this.currentPosition);
  }

  /** Raycast screen position to ground plane */
  getWorldPosition(screenX: number, screenY: number, _groundPlane?: THREE.Plane): THREE.Vector3 | null {
    const ndc = new THREE.Vector2(
      (screenX / this.containerWidth) * 2 - 1,
      -(screenY / this.containerHeight) * 2 + 1,
    );

    this.raycaster.setFromCamera(ndc, this.camera);
    const target = new THREE.Vector3();
    const plane = _groundPlane || this.groundPlane;
    const hit = this.raycaster.ray.intersectPlane(plane, target);
    return hit;
  }

  /** Smoothly move camera to look at a position */
  setTarget(position: THREE.Vector3): void {
    this.targetPosition.copy(position);
    this.targetPosition.y = 0; // keep on ground plane
  }

  /** Animate camera to a position over a duration using ease-in-out */
  panTo(position: THREE.Vector3, duration = 0.8): void {
    const to = position.clone();
    to.y = 0; // keep on ground plane
    this.panAnimation = {
      from: this.currentPosition.clone(),
      to,
      elapsed: 0,
      duration,
    };
    // Set targetPosition so after animation completes, normal smoothing keeps camera there
    this.targetPosition.copy(to);
  }

  /** Handle window resize */
  onResize(): void {
    this.containerWidth = this.container.clientWidth;
    this.containerHeight = this.container.clientHeight;
    this.camera.aspect = this.containerWidth / this.containerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** Get look-at position */
  getLookAtPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    this.container.removeEventListener('mousemove', this.boundOnMouseMove);
    this.container.removeEventListener('mousedown', this.boundOnMouseDown);
    window.removeEventListener('mouseup', this.boundOnMouseUp);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    this.container.removeEventListener('contextmenu', this.boundOnContextMenu);
    this.container.removeEventListener('touchstart', this.boundOnTouchStart);
    this.container.removeEventListener('touchmove', this.boundOnTouchMove);
    this.container.removeEventListener('touchend', this.boundOnTouchEnd);
  }
}

