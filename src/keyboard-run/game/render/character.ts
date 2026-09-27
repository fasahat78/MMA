import * as THREE from "three";
import { palette } from "./palette";

// Original block-style runner: cube head, box limbs, no studs or claw hands
// (brief §6 — not a LEGO minifigure). Built as named slots so later
// accessories can attach to head / back / hands.
// Origin = capsule centre; feet at y = -0.9.

const HIP_Y = -0.25;
const SHOULDER_Y = 0.3;
const RUN_CYCLE_RATE = 2.2;
const LAND_SQUASH = 0.82;

function box(w: number, h: number, d: number, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
  );
  mesh.castShadow = true;
  return mesh;
}

/** A limb hanging from a pivot, so rotating the pivot swings it. */
function limb(x: number, pivotY: number, length: number, width: number, color: string, footColor?: string): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, pivotY, 0);
  const segment = box(width, length, width, color);
  segment.position.y = -length / 2;
  pivot.add(segment);
  if (footColor) {
    const foot = box(width + 0.04, 0.12, width + 0.1, footColor);
    foot.position.set(0, -length + 0.06, 0.04);
    pivot.add(foot);
  }
  return pivot;
}

export class BlockCharacter {
  readonly root = new THREE.Group();
  /** Attachment slots for future cosmetics. */
  readonly slots: Record<"head" | "back" | "leftHand" | "rightHand", THREE.Group>;
  private readonly body = new THREE.Group();
  private readonly legL: THREE.Group;
  private readonly legR: THREE.Group;
  private readonly armL: THREE.Group;
  private readonly armR: THREE.Group;
  private phase = 0;
  private squash = 1;
  private wasGrounded = true;
  private facing = 0;

  constructor() {
    this.legL = limb(0.17, HIP_Y, 0.65, 0.28, palette.legs, palette.shoes);
    this.legR = limb(-0.17, HIP_Y, 0.65, 0.28, palette.legs, palette.shoes);

    const torso = box(0.72, 0.6, 0.42, palette.body);
    torso.position.y = HIP_Y + 0.3;

    this.armL = limb(0.47, SHOULDER_Y, 0.55, 0.2, palette.body);
    this.armR = limb(-0.47, SHOULDER_Y, 0.55, 0.2, palette.body);
    for (const arm of [this.armL, this.armR]) {
      const hand = box(0.22, 0.16, 0.22, palette.head);
      hand.position.y = -0.6;
      arm.add(hand);
    }

    const head = new THREE.Group();
    head.position.y = 0.65;
    head.add(box(0.56, 0.56, 0.56, palette.head));
    for (const sx of [-1, 1]) {
      const eye = box(0.08, 0.13, 0.02, palette.eyes);
      eye.position.set(sx * 0.12, 0.04, 0.285);
      eye.castShadow = false;
      const cheek = box(0.1, 0.05, 0.02, palette.cheeks);
      cheek.position.set(sx * 0.19, -0.08, 0.285);
      cheek.castShadow = false;
      head.add(eye, cheek);
    }

    const back = new THREE.Group();
    back.position.set(0, HIP_Y + 0.35, -0.22);
    this.slots = {
      head: head,
      back,
      leftHand: this.armL,
      rightHand: this.armR,
    };

    this.body.add(this.legL, this.legR, torso, this.armL, this.armR, head, back);
    this.root.add(this.body);
  }

  update(opts: { speed: number; grounded: boolean; rising: boolean; sprinting: boolean; facingYaw: number; dt: number }): void {
    const { speed, grounded, dt } = opts;

    // Turn smoothly toward the direction of travel.
    const turn = Math.atan2(Math.sin(opts.facingYaw - this.facing), Math.cos(opts.facingYaw - this.facing));
    this.facing += turn * Math.min(1, dt * 14);
    this.root.rotation.y = this.facing;

    if (grounded) {
      this.phase += speed * RUN_CYCLE_RATE * dt;
      const swing = Math.sin(this.phase) * Math.min(1, speed / 6) * 0.9;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.9;
      this.armR.rotation.x = swing * 0.9;
    } else {
      // Arms up on the way up, legs tucked — reads as a jump from any angle.
      const armPose = opts.rising ? -2.6 : -1.4;
      this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, armPose, dt * 12);
      this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, armPose, dt * 12);
      this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0.5, dt * 12);
      this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, -0.3, dt * 12);
    }

    if (grounded && !this.wasGrounded) this.squash = LAND_SQUASH;
    this.wasGrounded = grounded;
    this.squash = THREE.MathUtils.lerp(this.squash, 1, Math.min(1, dt * 10));
    this.body.scale.set(1 + (1 - this.squash) * 0.5, this.squash, 1 + (1 - this.squash) * 0.5);
    this.body.position.y = -0.9 * (1 - this.squash);

    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, opts.sprinting && grounded ? 0.18 : 0, dt * 8);
  }
}
