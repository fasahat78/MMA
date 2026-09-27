import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { SIM_STEP_SEC } from "../data/movement";
import type { StageDefinition, Vec3 } from "../types/stage";
import type { EngineHandle, RunBridge } from "./bridge";
import { InputController } from "./input";
import { BlockCharacter } from "./render/character";
import { CameraRig } from "./render/cameraRig";
import { StageView } from "./render/stageView";
import { RenderWorld } from "./render/world";
import { Simulation } from "./sim/Simulation";

// Wires simulation, rendering and input into one loop. Loaded on demand (it
// pulls in three.js + the Rapier WASM), exactly like Phaser for the maze.

const MAX_FRAME_SEC = 0.1;
const MAX_STEPS_PER_FRAME = 5;
const TICK_INTERVAL_MS = 100;
const ESC_UNLOCK_GRACE_MS = 300;

export interface EngineOptions {
  stage: StageDefinition;
  reducedMotion: boolean;
}

/** Test-only seam, inert unless `window.__KR_E2E__` is set before load. */
interface E2ESeam {
  teleport: (feet: Vec3) => void;
  state: () => {
    position: number[];
    speed: number;
    grounded: boolean;
    runTimeMs: number;
    finished: boolean;
    checkpoint: number;
    paused: boolean;
  };
}
declare global {
  interface Window {
    __KR_E2E__?: boolean;
    __KR__?: E2ESeam;
  }
}

let rapierReady: Promise<void> | null = null;
const FONT_PROBE = `800 64px "Baloo 2"`;

export async function startEngine(container: HTMLElement, bridge: RunBridge, options: EngineOptions): Promise<EngineHandle> {
  rapierReady ??= RAPIER.init();
  // Key labels are drawn onto canvases, so the font must be ready first.
  await Promise.all([rapierReady, document.fonts?.load(FONT_PROBE).catch(() => undefined)]);

  const sim = new Simulation(RAPIER, options.stage);
  const world = new RenderWorld(container);
  const stageView = new StageView(sim.parts, options.reducedMotion);
  const character = new BlockCharacter();
  world.scene.add(stageView.group, character.root);
  const rig = new CameraRig(1);

  let paused = false;
  let rafId = 0;
  let last = performance.now();
  let accumulator = 0;
  let lastTick = 0;
  let clockSec = 0;
  let unlockedAt = -Infinity;
  let sprintSeen = false;
  const playerPos = new THREE.Vector3();

  function setPaused(next: boolean): void {
    if (paused === next) return;
    paused = next;
    input.releaseAll();
    if (paused) input.releaseLock();
    bridge.onPauseChange(paused);
  }

  function restartRun(): void {
    sim.restartRun();
    input.resetCamera();
    rig.snap();
    setPaused(false);
  }

  const input = new InputController(world.renderer.domElement, {
    onRespawn: () => {
      if (paused) return;
      if (sim.finished) restartRun();
      else sim.respawnNow();
    },
    onEscape: () => {
      // While the mouse is captured, the browser uses Esc to release it and
      // `onPointerLockChange` pauses. Some browsers also deliver the keydown;
      // ignore it then, or it would immediately un-pause.
      if (sim.finished || performance.now() - unlockedAt < ESC_UNLOCK_GRACE_MS) return;
      setPaused(!paused);
    },
    onConfirm: () => {
      if (sim.finished) restartRun();
    },
    onPointerLockChange: (locked) => {
      bridge.onPointerLockChange(locked);
      if (locked) return;
      unlockedAt = performance.now();
      if (!sim.finished) setPaused(true);
    },
  });

  world.renderer.domElement.addEventListener("click", () => {
    if (!paused) void input.requestLock();
  });

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    world.setSize(w, h);
    rig.setAspect(w / h);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const onVisibility = () => {
    if (document.hidden && !sim.finished) setPaused(true);
  };
  document.addEventListener("visibilitychange", onVisibility);

  function forwardEvents(): void {
    for (const event of sim.drainEvents()) {
      switch (event.type) {
        case "run-start":
          bridge.onRunStart();
          break;
        case "checkpoint":
          bridge.onCheckpoint(event.index, event.total);
          break;
        case "finish":
          input.releaseLock();
          bridge.onFinish(event.timeMs);
          break;
        case "fell":
          bridge.onFell();
          break;
        case "respawn":
          rig.snap();
          bridge.onRespawn(event.reason);
          break;
        case "run-reset":
          bridge.onRunReset();
          break;
      }
    }
  }

  function frame(now: number): void {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(MAX_FRAME_SEC, (now - last) / 1000);
    last = now;

    if (!paused) {
      clockSec += dt;
      accumulator += dt;
      let steps = 0;
      while (accumulator >= SIM_STEP_SEC && steps < MAX_STEPS_PER_FRAME) {
        sim.step(input.sample());
        accumulator -= SIM_STEP_SEC;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
      forwardEvents();
      if (!sprintSeen && sim.isSprinting) {
        sprintSeen = true;
        bridge.onSprintUsed();
      }
    }

    const alpha = paused ? 1 : accumulator / SIM_STEP_SEC;
    playerPos.set(
      THREE.MathUtils.lerp(sim.prevPosition[0], sim.position[0], alpha),
      THREE.MathUtils.lerp(sim.prevPosition[1], sim.position[1], alpha),
      THREE.MathUtils.lerp(sim.prevPosition[2], sim.position[2], alpha),
    );
    character.root.position.copy(playerPos);
    if (!paused) {
      stageView.update(sim, alpha, dt);
      character.update({
        speed: Math.hypot(sim.motion.vx, sim.motion.vz),
        grounded: sim.grounded,
        rising: sim.motion.vy > 0,
        sprinting: sim.isSprinting,
        facingYaw: sim.facingYaw,
        dt,
      });
    }
    world.followPlayer(playerPos);
    world.animate(clockSec, stageView.reducedMotion);
    rig.update(playerPos, input.yaw, input.pitch, dt);
    world.render(rig.camera);

    if (now - lastTick >= TICK_INTERVAL_MS) {
      lastTick = now;
      bridge.onTick(sim.runTimeMs);
    }
  }
  rafId = requestAnimationFrame(frame);

  if (window.__KR_E2E__) {
    window.__KR__ = {
      teleport: (feet) => {
        sim.placeAt(feet);
        rig.snap();
      },
      state: () => ({
        position: [...sim.position],
        speed: Math.hypot(sim.motion.vx, sim.motion.vz),
        grounded: sim.grounded,
        runTimeMs: sim.runTimeMs,
        finished: sim.finished,
        checkpoint: sim.activeCheckpoint,
        paused,
      }),
    };
  }

  return {
    restartRun,
    resume: () => setPaused(false),
    pause: () => setPaused(true),
    captureMouse: () => void input.requestLock(),
    setReducedMotion: (reduced) => {
      stageView.reducedMotion = reduced;
    },
    dispose: () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      input.dispose();
      world.dispose();
      sim.dispose();
      delete window.__KR__;
    },
  };
}
