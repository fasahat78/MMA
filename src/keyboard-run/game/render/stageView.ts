import * as THREE from "three";
import type { Part } from "../stageLayout";
import type { Simulation } from "../sim/Simulation";
import { palette } from "./palette";
import { chevronTexture, finishBannerTexture, keyLabelTexture, stripeTexture } from "./textures";

// Builds a mesh for every stage part and keeps moving ones in sync with the
// simulation. Geometry comes straight from the parts, so visuals always match
// collision.

const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });

// BoxGeometry material slots: +x, -x, +y (top), -y, +z, -z.
const FALLING_SHAKE = 0.08;
const FALLING_WARNING = new THREE.Color("#ff3b30");
const FALLING_WARNING_INTENSITY = 0.45;
const BLACK = new THREE.Color("#000000");

interface Animated {
  update(sim: Simulation, alpha: number, dt: number): void;
}

export class StageView {
  readonly group = new THREE.Group();
  private readonly animated: Animated[] = [];
  /** Live: toggling the OS setting mid-run applies without a restart. */
  reducedMotion: boolean;

  constructor(parts: readonly Part[], reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    for (const part of parts) this.addPart(part);
  }

  update(sim: Simulation, alpha: number, dt: number): void {
    for (const a of this.animated) a.update(sim, alpha, dt);
  }

  private addPart(part: Part): void {
    switch (part.obstacleType) {
      case "platform":
        return this.addBox(part, this.platformColor(part));
      case "bridge":
        return this.addBridge(part);
      case "keyboard-run":
        return this.addKey(part, palette.keyCap, palette.keyCapSide);
      case "falling-keys":
        return this.addKey(part, palette.fallingCap, palette.fallingSide);
      case "moving-platform":
        return this.addBox(part, palette.mover);
      case "lift":
        return this.addLift(part);
      case "treadmill":
        return this.addTreadmill(part);
      case "speed-pad":
        return this.addSpeedPad(part);
      case "checkpoint":
        return this.addCheckpoint(part);
      case "finish":
        return this.addFinish(part);
    }
  }

  private platformColor(part: Part): string {
    if (part.id.includes("road")) return palette.road;
    if (part.center[1] > 5) return palette.deck;
    return palette.landing;
  }

  private boxMesh(part: Part, materials: THREE.Material | THREE.Material[]): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), materials);
    mesh.position.set(...part.center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    if (part.kind === "moving" || part.kind === "falling") this.follow(part, mesh);
    return mesh;
  }

  private addBox(part: Part, top: string): void {
    const side = mat(new THREE.Color(top).multiplyScalar(0.78).getStyle());
    const materials = [side, side, mat(top), side, side, side];
    this.boxMesh(part, materials);
  }

  /** Keeps a mesh on its dynamic part, interpolated between physics steps. */
  private follow(part: Part, object: THREE.Mesh): void {
    const materials = (Array.isArray(object.material) ? object.material : [object.material]) as THREE.MeshStandardMaterial[];
    let warned = false;
    this.animated.push({
      update: (sim, alpha) => {
        const d = sim.dynamicPart(part.id);
        if (!d) return;
        object.position.set(
          THREE.MathUtils.lerp(d.prevPosition[0], d.position[0], alpha),
          THREE.MathUtils.lerp(d.prevPosition[1], d.position[1], alpha),
          THREE.MathUtils.lerp(d.prevPosition[2], d.position[2], alpha),
        );
        // Falling keys glow red (and wobble, unless reduced motion) before they drop.
        const armed = d.fallPhase === "armed";
        if (armed && !this.reducedMotion) {
          object.position.x += (Math.random() - 0.5) * FALLING_SHAKE;
          object.position.z += (Math.random() - 0.5) * FALLING_SHAKE;
        }
        if (armed !== warned) {
          warned = armed;
          for (const m of materials) {
            m.emissive.copy(armed ? FALLING_WARNING : BLACK);
            m.emissiveIntensity = armed ? FALLING_WARNING_INTENSITY : 1;
          }
        }
      },
    });
  }

  private addKey(part: Part, cap: string, side: string): void {
    const sideMat = mat(side);
    const top = part.label ? keyLabelTexture(part.label, cap, part.size[2] / part.size[0]) : null;
    if (top) {
      // Upright for a player looking down +Z.
      top.center.set(0.5, 0.5);
      top.rotation = Math.PI;
    }
    const materials = [sideMat, sideMat, mat(cap, { map: top }), sideMat, sideMat, sideMat];
    this.boxMesh(part, materials);
  }

  private addBridge(part: Part): void {
    const planks = stripeTexture(palette.bridgePlank, new THREE.Color(palette.bridgePlank).multiplyScalar(0.85).getStyle());
    planks.repeat.set(1, part.size[2] / 1.2);
    const side = mat(palette.bridgeRope);
    this.boxMesh(part, [side, side, mat("#ffffff", { map: planks }), side, side, side]);

    // Decorative posts at each corner (no collision — the bridge is meant to be narrow).
    const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8);
    const postMat = mat(palette.bridgeRope);
    const top = part.center[1] + part.size[1] / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(part.center[0] + (sx * part.size[0]) / 2, top + 0.55, part.center[2] + (sz * part.size[2]) / 2);
        post.castShadow = true;
        this.group.add(post);
      }
    }
  }

  private addLift(part: Part): void {
    const stripes = stripeTexture(palette.lift, palette.liftStripe);
    stripes.repeat.set(part.size[0] / 0.8, 1);
    const side = mat("#ffffff", { map: stripes });
    this.boxMesh(part, [side, side, mat(palette.lift), side, side, side]);
  }

  private addTreadmill(part: Part): void {
    const belt = chevronTexture(palette.treadmillBelt, palette.treadmillChevron);
    const tileLength = 1.25;
    belt.repeat.set(part.size[0] / 1.6, part.size[2] / tileLength);
    const frame = mat(palette.treadmillFrame);
    this.boxMesh(part, [frame, frame, mat("#ffffff", { map: belt, roughness: 0.5 }), frame, frame, frame]);

    // Scroll the chevrons at the belt speed (see textures.ts for the direction).
    const beltZ = part.belt?.[2] ?? 0;
    this.animated.push({
      update(_sim, _alpha, dt) {
        belt.offset.y += (beltZ * dt) / tileLength;
      },
    });
  }

  private addSpeedPad(part: Part): void {
    const arrows = chevronTexture(palette.speedPad, palette.speedPadArrow);
    arrows.center.set(0.5, 0.5);
    arrows.rotation = Math.PI; // point along +Z, the way the course goes
    arrows.repeat.set(1, part.size[2] / 1);
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(part.size[0], part.size[2]),
      mat("#ffffff", { map: arrows, emissive: palette.speedPad, emissiveIntensity: 0.35 }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(part.center[0], part.center[1] - part.size[1] / 2 + 0.02, part.center[2]);
    pad.receiveShadow = true;
    this.group.add(pad);
    this.animated.push({
      update: (_sim, _alpha, dt) => {
        if (!this.reducedMotion) arrows.offset.y -= dt * 1.5;
      },
    });
  }

  private addCheckpoint(part: Part): void {
    const floor = part.center[1] - part.size[1] / 2;
    const x = part.center[0] + part.size[0] / 2 - 0.35;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 10), mat(palette.flagPole));
    pole.position.set(x, floor + 1.5, part.center[2]);
    pole.castShadow = true;
    const flagMat = mat(palette.flagIdle, { side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.05), flagMat);
    flag.position.set(x - 0.62, floor + 2.55, part.center[2]);
    flag.castShadow = true;
    this.group.add(pole, flag);

    const index = part.zone?.role === "checkpoint" ? part.zone.index : 0;
    const idle = new THREE.Color(palette.flagIdle);
    const active = new THREE.Color(palette.flagActive);
    this.animated.push({
      update(sim) {
        flagMat.color.copy(sim.activeCheckpoint >= index ? active : idle);
      },
    });
  }

  private addFinish(part: Part): void {
    const floor = part.center[1] - part.size[1] / 2;
    const halfWidth = part.size[0] / 2;
    // The arch stands at the front of the finish zone, where finishing happens.
    const archZ = part.center[2] - part.size[2] / 2 + 0.3;
    const postGeo = new THREE.BoxGeometry(0.4, 4.4, 0.4);
    const postMat = mat(palette.finishPost);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(part.center[0] + sx * halfWidth, floor + 2.2, archZ);
      post.castShadow = true;
      this.group.add(post);
    }
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(part.size[0], part.size[0] / 4),
      new THREE.MeshStandardMaterial({ map: finishBannerTexture(), side: THREE.DoubleSide, roughness: 0.6 }),
    );
    banner.rotation.y = Math.PI; // readable from the approach side (-Z)
    banner.position.set(part.center[0], floor + 4.4 - part.size[0] / 8, archZ);
    this.group.add(banner);
  }
}
