import * as THREE from "three";
import { KEYBOARD_MESSAGES, type KeyLabel } from "../../data/keyboardMessages";
import { palette } from "./palette";

// Textures drawn on a canvas at load time — no image files to download.

const FONT = `"Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif`;
const MESSAGES: readonly string[] = KEYBOARD_MESSAGES;

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Splits a phrase into lines and finds the largest font that fits. */
function fitText(ctx: CanvasRenderingContext2D, text: string, box: number): { lines: string[]; px: number } {
  const words = text.split(" ");
  const candidates = [words.join(" ")];
  if (words.length > 1) candidates.push(words.join("\n"));
  if (words.length > 2) candidates.push(`${words.slice(0, 2).join(" ")}\n${words.slice(2).join(" ")}`, `${words[0]}\n${words.slice(1).join(" ")}`);

  let best = { lines: [text], px: 12 };
  for (const candidate of candidates) {
    const lines = candidate.split("\n");
    let px = box;
    for (; px > 12; px -= 4) {
      ctx.font = `800 ${px}px ${FONT}`;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (widest <= box && px * 1.05 * lines.length <= box) break;
    }
    if (px > best.px) best = { lines, px };
  }
  return best;
}

/** Top face of a keycap: rounded inset and the label. */
export function keyLabelTexture(label: KeyLabel, capColor: string): THREE.CanvasTexture {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = capColor;
    ctx.fillRect(0, 0, s, s);
    // Dished centre to read as a keycap.
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.roundRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84, s * 0.12);
    ctx.fill();

    const isMessage = MESSAGES.includes(label);
    const inner = label.length === 1 ? s * 0.5 : s * 0.72;
    const { lines, px } = fitText(ctx, label, inner);
    ctx.font = `800 ${px}px ${FONT}`;
    ctx.fillStyle = isMessage ? palette.keyMessageText : palette.keyText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineHeight = px * 1.05;
    lines.forEach((line, i) => {
      ctx.fillText(line, s / 2, s / 2 + (i - (lines.length - 1) / 2) * lineHeight);
    });
  });
}

/** Chevrons pointing along +V; scroll `offset.y` to animate a belt. */
export function chevronTexture(background: string, chevron: string): THREE.CanvasTexture {
  const texture = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = chevron;
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.65);
    ctx.lineTo(s * 0.5, s * 0.35);
    ctx.lineTo(s * 0.8, s * 0.65);
    ctx.stroke();
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Diagonal hazard stripes for the lift deck edge. */
export function stripeTexture(a: string, b: string): THREE.CanvasTexture {
  const texture = canvasTexture(64, (ctx, s) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = b;
    for (let i = -s; i < s * 2; i += s / 2) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s / 4, 0);
      ctx.lineTo(i + s / 4 - s, s);
      ctx.lineTo(i - s, s);
      ctx.fill();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Checkered "FINISH" banner. */
export function finishBannerTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const cell = 32;
  for (let x = 0; x < w; x += cell) {
    for (let y = 0; y < h; y += cell) {
      ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? palette.finishBannerA : palette.finishBannerB;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.fillStyle = palette.finishPost;
  ctx.beginPath();
  ctx.roundRect(w * 0.22, h * 0.12, w * 0.56, h * 0.76, 24);
  ctx.fill();
  ctx.font = `800 84px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FINISH", w / 2, h / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
