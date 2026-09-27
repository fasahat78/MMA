import * as THREE from "three";
import { palette } from "./palette";

// Renderer, sky, lights and the floating-keycap backdrop.

const SHADOW_EXTENT = 22;
const BACKDROP_COUNT = 90;

export class RenderWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  private readonly sun: THREE.DirectionalLight;
  private readonly backdrop: THREE.InstancedMesh;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    this.scene.background = this.skyGradient();
    this.scene.fog = new THREE.Fog(palette.fog, 70, 190);

    this.scene.add(new THREE.HemisphereLight(palette.sky, palette.hemiGround, 1.6));
    this.sun = new THREE.DirectionalLight("#ffffff", 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -SHADOW_EXTENT;
    cam.right = SHADOW_EXTENT;
    cam.top = SHADOW_EXTENT;
    cam.bottom = -SHADOW_EXTENT;
    cam.near = 1;
    cam.far = 80;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    this.backdrop = this.buildBackdrop();
    this.scene.add(this.backdrop);
  }

  /** Keeps the shadow map centred on the player so it stays sharp. */
  followPlayer(p: THREE.Vector3): void {
    this.sun.position.set(p.x + 6, p.y + 24, p.z - 8);
    this.sun.target.position.copy(p);
  }

  animate(timeSec: number, reducedMotion: boolean): void {
    if (!reducedMotion) this.backdrop.rotation.y = timeSec * 0.01;
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  private skyGradient(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, palette.sky);
    g.addColorStop(1, palette.skyHorizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /** Giant keycaps drifting around the course — one instanced draw call. */
  private buildBackdrop(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.5, 1),
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      BACKDROP_COUNT,
    );
    // Deterministic scatter so every visit looks the same.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const color = new THREE.Color();
    for (let i = 0; i < BACKDROP_COUNT; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 45 + rand() * 60;
      const scale = 2 + rand() * 5;
      e.set(rand() * 0.8, rand() * Math.PI, rand() * 0.8);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(Math.cos(angle) * radius, -30 + rand() * 60, 50 + Math.sin(angle) * radius),
        q,
        new THREE.Vector3(scale, scale, scale),
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(palette.backdrop[i % palette.backdrop.length]));
    }
    return mesh;
  }

  dispose(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      }
    });
    (this.scene.background as THREE.Texture | null)?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
