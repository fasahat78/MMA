import Phaser from "phaser";
import { MAZE_SCENE_KEY, type MazeSceneData } from "./gameBridge";
import { generateMaze, type Cell, type GeneratedMaze } from "./mazeGenerator";
import { colorsForTheme, decorForTheme } from "../data/maps";
import { POWERUPS, chaserConfig, powerUpCount } from "../data/modes";
import { sfx } from "../audio/sound";

// Spec v2 §12 — grid maze rendered in Phaser. Player moves tile-by-tile,
// cannot pass walls, collects gems, wins on the exit tile.
// Modes (post-MVP): Medium/Hard add a chaser that pursues the player.

type Dir = "up" | "down" | "left" | "right";

export class MazeScene extends Phaser.Scene {
  private sceneData!: MazeSceneData;
  private maze!: GeneratedMaze;
  private tileSize = 32;
  private offsetX = 0;
  private offsetY = 0;

  private playerRow = 1;
  private playerCol = 1;
  private player!: Phaser.GameObjects.Text;
  private gemSprites = new Map<string, Phaser.GameObjects.Text>();
  private collected = 0;
  private finished = false;
  private moving = false;

  // Chaser (Medium/Hard modes only).
  private chaser?: Phaser.GameObjects.Text;
  private chaserRow = 0;
  private chaserCol = 0;
  private chaserTimer?: Phaser.Time.TimerEvent;
  private chaserEmoji = "";

  // Power-ups (chase modes). Effects are time-boxed via the scene clock.
  private shieldSprites = new Map<string, Phaser.GameObjects.Text>();
  private stunSprites = new Map<string, Phaser.GameObjects.Text>();
  private invulnUntil = 0;
  private chaserStunnedUntil = 0;
  private lastShieldSec = 0;
  private lastStunSec = 0;

  constructor() {
    super(MAZE_SCENE_KEY);
  }

  init(data: MazeSceneData) {
    this.sceneData = data;
    this.collected = 0;
    this.finished = false;
    this.moving = false;
    this.gemSprites.clear();
    this.shieldSprites.clear();
    this.stunSprites.clear();
    this.chaser = undefined;
    this.chaserTimer = undefined;
    this.invulnUntil = 0;
    this.chaserStunnedUntil = 0;
    this.lastShieldSec = 0;
    this.lastStunSec = 0;
  }

  create() {
    const { difficulty, gemTarget, theme, gameMode } = this.sceneData;
    const { difficultySettings } = sizeFor(difficulty);
    const cfg = chaserConfig[gameMode];
    const powerUps = cfg.enabled ? powerUpCount(difficulty) : 0;
    // Optional fixed seed for deterministic E2E runs (no effect in normal play).
    const seed = (window as unknown as { __MMA_SEED__?: number }).__MMA_SEED__;
    this.maze = generateMaze({
      rows: difficultySettings.rows,
      cols: difficultySettings.cols,
      gems: gemTarget,
      braid: cfg.enabled, // escape-route loops only when something chases you
      shields: powerUps,
      stuns: powerUps,
      seed,
    });

    this.playerRow = this.maze.start.r;
    this.playerCol = this.maze.start.c;

    this.layout();
    this.drawMaze(theme);
    this.drawPowerUps();
    this.drawPlayer();
    this.spawnChaser();
    this.bindInput();

    this.scale.on("resize", this.onResize, this);

    // Report the true gem count placed (may be < target on tiny mazes).
    this.sceneData.bridge.onGemCollected(0);

    this.exposeE2EHooks();
  }

  // Medium/Hard only: place a chaser far from the player and start it pursuing
  // after a short grace period. Speed (stepMs) differs per mode.
  private spawnChaser() {
    const cfg = chaserConfig[this.sceneData.gameMode];
    if (!cfg.enabled) return;

    this.chaserEmoji = cfg.emoji;
    const startCell = this.farthestNonWallFromPlayer();
    this.chaserRow = startCell.r;
    this.chaserCol = startCell.c;

    const fontSize = Math.floor(this.tileSize * 0.7);
    this.chaser = this.add
      .text(this.tileCenterX(this.chaserCol), this.tileCenterY(this.chaserRow), cfg.emoji, {
        fontSize: `${fontSize}px`,
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.chaserTimer = this.time.addEvent({
      delay: cfg.stepMs,
      startAt: cfg.stepMs - 1, // begin promptly after the grace delay below
      loop: true,
      paused: true,
      callback: this.stepChaser,
      callbackScope: this,
    });
    // Grace period before the chase begins.
    this.time.delayedCall(cfg.graceMs, () => this.chaserTimer?.paused && this.resumeChaser());
  }

  private resumeChaser() {
    if (this.chaserTimer) this.chaserTimer.paused = false;
  }

  // Place power-up sprites. They sit on path tiles (tracked by position).
  private drawPowerUps() {
    const fontSize = Math.floor(this.tileSize * 0.6);
    const place = (cells: { r: number; c: number }[], emoji: string, map: Map<string, Phaser.GameObjects.Text>) => {
      for (const { r, c } of cells) {
        const sprite = this.add
          .text(this.tileCenterX(c), this.tileCenterY(r), emoji, { fontSize: `${fontSize}px` })
          .setOrigin(0.5)
          .setDepth(5);
        map.set(this.key(r, c), sprite);
      }
    };
    place(this.maze.shieldPositions, POWERUPS.shieldEmoji, this.shieldSprites);
    place(this.maze.stunPositions, POWERUPS.stunEmoji, this.stunSprites);
  }

  private get invulnerable(): boolean {
    return this.time.now < this.invulnUntil;
  }

  private get chaserStunned(): boolean {
    return this.time.now < this.chaserStunnedUntil;
  }

  // One chaser step toward the player along the shortest open path.
  private stepChaser() {
    if (this.finished || !this.chaser || this.chaserStunned) return;
    const path = this.bfsPath(
      { r: this.chaserRow, c: this.chaserCol },
      { r: this.playerRow, c: this.playerCol },
    );
    if (path.length === 0) return;

    const delta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[path[0]];
    this.chaserRow += delta[0];
    this.chaserCol += delta[1];

    const x = this.tileCenterX(this.chaserCol);
    const y = this.tileCenterY(this.chaserRow);
    if (this.sceneData.reducedMotion) {
      this.chaser.setPosition(x, y);
    } else {
      this.tweens.add({ targets: this.chaser, x, y, duration: 120, ease: "Quad.easeInOut" });
    }

    this.checkCaught();
  }

  private checkCaught() {
    if (this.invulnerable) return; // shield: pass through the chaser unharmed
    if (this.chaserRow === this.playerRow && this.chaserCol === this.playerCol) {
      this.caught();
    }
  }

  // Test-only seam (spec §testing). No effect unless window.__MMA_E2E__ is set,
  // so it adds nothing to normal play. Exposes the shortest start→exit path and
  // a step driver so an E2E test can solve a maze deterministically.
  private exposeE2EHooks() {
    const w = window as unknown as {
      __MMA_E2E__?: boolean;
      __MMA_SOLUTION__?: Dir[];
      __MMA_STEP__?: (dir: Dir) => void;
      __MMA_POWERUPS__?: { shields: Cell[]; stuns: Cell[] };
      __MMA_PATHTO__?: (r: number, c: number) => Dir[];
    };
    if (!w.__MMA_E2E__) return;
    w.__MMA_SOLUTION__ = this.solvePath();
    w.__MMA_STEP__ = (dir: Dir) => this.move(dir);
    w.__MMA_POWERUPS__ = {
      shields: this.maze.shieldPositions,
      stuns: this.maze.stunPositions,
    };
    w.__MMA_PATHTO__ = (r: number, c: number) =>
      this.bfsPath({ r: this.playerRow, c: this.playerCol }, { r, c });
  }

  // BFS shortest path from start to exit, returned as movement directions.
  private solvePath(): Dir[] {
    return this.bfsPath(this.maze.start, this.maze.exit);
  }

  // BFS shortest path between any two open cells, as movement directions.
  // Used both by the solver seam and the chaser pursuit.
  private bfsPath(from: Cell, to: Cell): Dir[] {
    const { rows, cols, tiles } = this.maze;
    const prev = new Map<string, { from: string; dir: Dir }>();
    const seen = new Set<string>([this.key(from.r, from.c)]);
    const queue: Cell[] = [from];
    const steps: { dr: number; dc: number; dir: Dir }[] = [
      { dr: -1, dc: 0, dir: "up" },
      { dr: 1, dc: 0, dir: "down" },
      { dr: 0, dc: -1, dir: "left" },
      { dr: 0, dc: 1, dir: "right" },
    ];

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.r === to.r && cur.c === to.c) break;
      for (const { dr, dc, dir } of steps) {
        const nr = cur.r + dr;
        const nc = cur.c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (tiles[nr][nc] === "wall") continue;
        const k = this.key(nr, nc);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, { from: this.key(cur.r, cur.c), dir });
        queue.push({ r: nr, c: nc });
      }
    }

    const path: Dir[] = [];
    let cursor = this.key(to.r, to.c);
    const fromKey = this.key(from.r, from.c);
    while (cursor !== fromKey) {
      const step = prev.get(cursor);
      if (!step) break;
      path.unshift(step.dir);
      cursor = step.from;
    }
    return path;
  }

  // Pick the open cell (not start/exit) farthest from the player by path
  // distance, so the chaser starts as far away as possible.
  private farthestNonWallFromPlayer(): Cell {
    const { rows, cols, tiles } = this.maze;
    const startCell: Cell = { r: this.playerRow, c: this.playerCol };
    const dist = new Map<string, number>([[this.key(startCell.r, startCell.c), 0]]);
    const queue: Cell[] = [startCell];
    const steps = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    let best = startCell;
    let bestDist = -1;

    while (queue.length) {
      const cur = queue.shift()!;
      const d = dist.get(this.key(cur.r, cur.c))!;
      const tile = tiles[cur.r][cur.c];
      const eligible = tile !== "start" && tile !== "exit";
      if (eligible && d > bestDist) {
        bestDist = d;
        best = cur;
      }
      for (const [dr, dc] of steps) {
        const nr = cur.r + dr;
        const nc = cur.c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (tiles[nr][nc] === "wall") continue;
        const k = this.key(nr, nc);
        if (dist.has(k)) continue;
        dist.set(k, d + 1);
        queue.push({ r: nr, c: nc });
      }
    }
    return best;
  }

  private layout() {
    const { width, height } = this.scale.gameSize;
    const maxTileW = Math.floor(width / this.maze.cols);
    const maxTileH = Math.floor(height / this.maze.rows);
    this.tileSize = Math.max(16, Math.min(maxTileW, maxTileH, 48));
    const mazeW = this.tileSize * this.maze.cols;
    const mazeH = this.tileSize * this.maze.rows;
    this.offsetX = Math.floor((width - mazeW) / 2);
    this.offsetY = Math.floor((height - mazeH) / 2);
  }

  private drawMaze(theme: string) {
    const colors = colorsForTheme(theme);
    this.cameras.main.setBackgroundColor(colors.bg);

    const g = this.add.graphics();
    for (let r = 0; r < this.maze.rows; r++) {
      for (let c = 0; c < this.maze.cols; c++) {
        const x = this.offsetX + c * this.tileSize;
        const y = this.offsetY + r * this.tileSize;
        const tile = this.maze.tiles[r][c];
        const fill = tile === "wall" ? colors.wall : colors.path;
        g.fillStyle(fill, 1);
        g.fillRoundedRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2, 6);
      }
    }

    const fontSize = Math.floor(this.tileSize * 0.6);

    this.scatterDecor(theme);

    // Exit tile marker.
    this.add
      .text(
        this.tileCenterX(this.maze.exit.c),
        this.tileCenterY(this.maze.exit.r),
        "🏁",
        { fontSize: `${fontSize}px` },
      )
      .setOrigin(0.5);

    // Gems.
    for (let r = 0; r < this.maze.rows; r++) {
      for (let c = 0; c < this.maze.cols; c++) {
        if (this.maze.tiles[r][c] === "gem") {
          const gem = this.add
            .text(this.tileCenterX(c), this.tileCenterY(r), "💎", { fontSize: `${fontSize}px` })
            .setOrigin(0.5);
          this.gemSprites.set(this.key(r, c), gem);
        }
      }
    }
  }

  // Sprinkle themed scenery on some wall tiles so the maze clearly reads as
  // its theme. Purely decorative (sits behind gems/player; on walls only, so
  // it never blocks the path or looks like a pickup).
  private scatterDecor(theme: string) {
    const decor = decorForTheme(theme);
    const wallCells: Cell[] = [];
    for (let r = 1; r < this.maze.rows - 1; r++) {
      for (let c = 1; c < this.maze.cols - 1; c++) {
        if (this.maze.tiles[r][c] === "wall") wallCells.push({ r, c });
      }
    }
    if (wallCells.length === 0) return;

    const target = Math.min(
      wallCells.length,
      Math.max(5, Math.floor((this.maze.rows * this.maze.cols) / 22)),
    );
    const size = Math.floor(this.tileSize * 0.5);
    for (let i = 0; i < target; i++) {
      const pick = Math.floor(Math.random() * wallCells.length);
      const { r, c } = wallCells.splice(pick, 1)[0];
      const emoji = decor[Math.floor(Math.random() * decor.length)];
      this.add
        .text(this.tileCenterX(c), this.tileCenterY(r), emoji, { fontSize: `${size}px` })
        .setOrigin(0.5)
        .setAlpha(0.9)
        .setDepth(1);
    }
  }

  private drawPlayer() {
    const fontSize = Math.floor(this.tileSize * 0.7);
    this.player = this.add
      .text(
        this.tileCenterX(this.playerCol),
        this.tileCenterY(this.playerRow),
        this.sceneData.characterEmoji,
        { fontSize: `${fontSize}px` },
      )
      .setOrigin(0.5)
      .setDepth(10);
  }

  private bindInput() {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on("keydown-UP", () => this.tryMove("up"));
      keyboard.on("keydown-DOWN", () => this.tryMove("down"));
      keyboard.on("keydown-LEFT", () => this.tryMove("left"));
      keyboard.on("keydown-RIGHT", () => this.tryMove("right"));
      keyboard.on("keydown-W", () => this.tryMove("up"));
      keyboard.on("keydown-S", () => this.tryMove("down"));
      keyboard.on("keydown-A", () => this.tryMove("left"));
      keyboard.on("keydown-D", () => this.tryMove("right"));
    }

    // Touch / mouse: tap a neighbouring tile direction (swipe-lite).
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const dx = p.x - this.tileCenterX(this.playerCol);
      const dy = p.y - this.tileCenterY(this.playerRow);
      if (Math.abs(dx) > Math.abs(dy)) {
        this.tryMove(dx > 0 ? "right" : "left");
      } else {
        this.tryMove(dy > 0 ? "down" : "up");
      }
    });
  }

  // Public so the React on-screen D-pad can drive movement (spec v2 §5.3).
  move(dir: Dir) {
    this.tryMove(dir);
  }

  private tryMove(dir: Dir) {
    if (this.finished || this.moving) return;
    const delta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
    const nr = this.playerRow + delta[0];
    const nc = this.playerCol + delta[1];
    if (nr < 0 || nr >= this.maze.rows || nc < 0 || nc >= this.maze.cols) return;
    if (this.maze.tiles[nr][nc] === "wall") return;

    this.playerRow = nr;
    this.playerCol = nc;

    const targetX = this.tileCenterX(nc);
    const targetY = this.tileCenterY(nr);

    if (this.sceneData.reducedMotion) {
      this.player.setPosition(targetX, targetY);
      this.afterMove(nr, nc);
    } else {
      this.moving = true;
      this.tweens.add({
        targets: this.player,
        x: targetX,
        y: targetY,
        duration: 90,
        ease: "Quad.easeInOut",
        onComplete: () => {
          this.moving = false;
          this.afterMove(nr, nc);
        },
      });
    }
  }

  private afterMove(r: number, c: number) {
    const key = this.key(r, c);
    const gem = this.gemSprites.get(key);
    if (gem) {
      this.collectGem(gem, key);
    }
    this.pickUpPowerUps(key);
    // Walking into the chaser ends the run too.
    this.checkCaught();
    if (this.finished) return;
    if (r === this.maze.exit.r && c === this.maze.exit.c) {
      this.win();
    }
  }

  private pickUpPowerUps(key: string) {
    const shield = this.shieldSprites.get(key);
    if (shield) {
      this.shieldSprites.delete(key);
      shield.destroy();
      this.activateShield();
    }
    const stun = this.stunSprites.get(key);
    if (stun) {
      this.stunSprites.delete(key);
      stun.destroy();
      this.activateStun();
    }
  }

  // 5s invulnerability — pass through the chaser unharmed.
  private activateShield() {
    this.invulnUntil = this.time.now + POWERUPS.durationMs;
    this.player.setAlpha(1);
    sfx.shield();
    this.emitEffects(true);
  }

  // 5s chaser stun — it freezes in place.
  private activateStun() {
    this.chaserStunnedUntil = this.time.now + POWERUPS.durationMs;
    this.chaser?.setText(POWERUPS.stunnedChaserEmoji);
    sfx.stun();
    this.emitEffects(true);
  }

  private collectGem(gem: Phaser.GameObjects.Text, key: string) {
    this.collected += 1;
    this.gemSprites.delete(key);
    sfx.gem();
    this.sceneData.bridge.onGemCollected(this.collected);
    if (this.sceneData.reducedMotion) {
      gem.destroy();
    } else {
      this.tweens.add({
        targets: gem,
        y: gem.y - 24,
        alpha: 0,
        scale: 1.5,
        duration: 260,
        ease: "Back.easeOut",
        onComplete: () => gem.destroy(),
      });
    }
  }

  private win() {
    if (this.finished) return;
    this.finished = true;
    this.stopChaser();
    sfx.win();
    this.sceneData.bridge.onMazeComplete({
      mapId: this.sceneData.mapId,
      gemsCollected: this.collected,
      totalGemsInMaze: this.maze.gemCount,
    });
  }

  private caught() {
    if (this.finished) return;
    this.finished = true;
    this.stopChaser();
    sfx.caught();
    this.sceneData.bridge.onCaught();
  }

  private stopChaser() {
    this.chaserTimer?.remove();
    this.chaserTimer = undefined;
  }

  // Per-frame upkeep: expire effects, animate, and push HUD countdowns.
  update() {
    if (this.finished) return;

    // Blink the player while shielded; restore opacity when it lapses.
    if (this.invulnerable) {
      this.player.setAlpha(Math.floor(this.time.now / 150) % 2 === 0 ? 1 : 0.45);
    } else if (this.player.alpha !== 1) {
      this.player.setAlpha(1);
    }

    // Restore the chaser's face once the stun ends.
    if (this.chaser && !this.chaserStunned && this.chaser.text === POWERUPS.stunnedChaserEmoji) {
      this.chaser.setText(this.chaserEmoji);
    }

    this.emitEffects();
  }

  private emitEffects(force = false) {
    const shieldSeconds = Math.max(0, Math.ceil((this.invulnUntil - this.time.now) / 1000));
    const stunSeconds = Math.max(0, Math.ceil((this.chaserStunnedUntil - this.time.now) / 1000));
    if (force || shieldSeconds !== this.lastShieldSec || stunSeconds !== this.lastStunSec) {
      this.lastShieldSec = shieldSeconds;
      this.lastStunSec = stunSeconds;
      this.sceneData.bridge.onEffectsChanged({ shieldSeconds, stunSeconds });
    }
  }

  private onResize() {
    // Simplest robust approach: rebuild the layout + redraw on resize.
    this.scene.restart(this.sceneData);
  }

  private tileCenterX(c: number) {
    return this.offsetX + c * this.tileSize + this.tileSize / 2;
  }
  private tileCenterY(r: number) {
    return this.offsetY + r * this.tileSize + this.tileSize / 2;
  }
  private key(r: number, c: number) {
    return `${r},${c}`;
  }
}

// Tiny indirection so the scene can read difficulty sizing without importing
// the whole data module twice; kept local to avoid a circular import.
function sizeFor(difficulty: number) {
  // Mirror of difficultySettings; the React side already validated difficulty.
  const table: Record<number, { rows: number; cols: number }> = {
    1: { rows: 9, cols: 9 },
    2: { rows: 11, cols: 11 },
    3: { rows: 13, cols: 13 },
    4: { rows: 15, cols: 15 },
    5: { rows: 17, cols: 17 },
    6: { rows: 19, cols: 19 },
    7: { rows: 21, cols: 21 },
  };
  return { difficultySettings: table[difficulty] ?? table[1] };
}
