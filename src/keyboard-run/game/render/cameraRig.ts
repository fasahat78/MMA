import * as THREE from "three";
import { cameraConfig } from "../../data/movement";

// Third-person follow camera. Orbits the player at a fixed distance using the
// yaw/pitch from the mouse, and eases toward the player to hide physics jitter.

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly target = new THREE.Vector3();
  private initialised = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(cameraConfig.fovDeg, aspect, 0.1, 400);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Jump straight to the player (after respawn), skipping the ease. */
  snap(): void {
    this.initialised = false;
  }

  update(player: THREE.Vector3, yaw: number, pitch: number, dt: number): void {
    const goal = player.clone().setY(player.y + cameraConfig.targetHeight);
    if (!this.initialised) {
      this.target.copy(goal);
      this.initialised = true;
    } else {
      this.target.lerp(goal, 1 - Math.exp(-cameraConfig.followSharpness * dt));
    }

    const horizontal = cameraConfig.distance * Math.cos(pitch);
    this.camera.position.set(
      this.target.x - Math.sin(yaw) * horizontal,
      this.target.y + cameraConfig.distance * Math.sin(pitch),
      this.target.z - Math.cos(yaw) * horizontal,
    );
    this.camera.lookAt(this.target);
  }
}
