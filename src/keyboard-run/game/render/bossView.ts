import * as THREE from "three";
import type { BossChaser } from "../sim/boss";
import { palette } from "./palette";
import { keyLabelTexture } from "./textures";

// The BOSS key: a giant pink keycap with a cartoon face — cheeky, not scary.
// Eyes shut while it sleeps; it hops along while chasing (still, with
// reduced motion). Pure display: position comes from the simulation.

const HOP_HEIGHT = 0.35;
const HOP_RATE = 9;
const TURN_RATE = 10;

function box(w: number, h: number, d: number, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  mesh.castShadow = true;
  return mesh;
}

export class BossView {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly openEyes = new THREE.Group();
  private readonly shutEyes = new THREE.Group();
  private hop = 0;
  private facing = Math.PI;

  constructor(size: number) {
    const side = new THREE.MeshStandardMaterial({ color: palette.bossSide, roughness: 0.55 });
    const top = keyLabelTexture("BOSS", palette.bossCap);
    top.center.set(0.5, 0.5);
    top.rotation = Math.PI;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), [
      side, side, new THREE.MeshStandardMaterial({ map: top, roughness: 0.55 }), side, side, side,
    ]);
    cap.castShadow = true;
    cap.position.y = size / 2;
    this.body.add(cap);

    // Face on the front (+Z) side.
    const face = size / 2 + 0.01;
    const eyeY = size * 0.62;
    for (const sx of [-1, 1]) {
      const white = box(size * 0.24, size * 0.26, 0.04, palette.bossFace);
      white.position.set(sx * size * 0.2, eyeY, face);
      const pupil = box(size * 0.1, size * 0.12, 0.04, palette.keyText);
      pupil.position.set(sx * size * 0.18, eyeY - size * 0.03, face + 0.03);
      // Brows tilt in: cheeky, not angry.
      const brow = box(size * 0.26, size * 0.05, 0.04, palette.keyText);
      brow.position.set(sx * size * 0.2, eyeY + size * 0.19, face + 0.02);
      brow.rotation.z = sx * -0.25;
      this.openEyes.add(white, pupil, brow);

      const shut = box(size * 0.22, size * 0.04, 0.04, palette.keyText);
      shut.position.set(sx * size * 0.2, eyeY, face + 0.02);
      this.shutEyes.add(shut);
    }
    const grin = box(size * 0.4, size * 0.07, 0.04, palette.keyText);
    grin.position.set(0, size * 0.3, face + 0.02);
    this.body.add(this.openEyes, this.shutEyes, grin);
    this.root.add(this.body);
  }

  update(boss: BossChaser, alpha: number, dt: number, reducedMotion: boolean): void {
    this.root.position.set(
      THREE.MathUtils.lerp(boss.prevPosition[0], boss.position[0], alpha),
      boss.floorY,
      THREE.MathUtils.lerp(boss.prevPosition[1], boss.position[1], alpha),
    );
    const awake = boss.phase !== "asleep";
    this.openEyes.visible = awake;
    this.shutEyes.visible = !awake;

    const turn = Math.atan2(Math.sin(boss.yaw - this.facing), Math.cos(boss.yaw - this.facing));
    this.facing += turn * Math.min(1, dt * TURN_RATE);
    this.root.rotation.y = this.facing;

    const hopping = boss.phase === "chasing" && !reducedMotion;
    this.hop = hopping ? this.hop + dt * HOP_RATE : 0;
    this.body.position.y = hopping ? Math.abs(Math.sin(this.hop)) * HOP_HEIGHT : 0;
  }
}
