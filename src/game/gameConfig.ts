import Phaser from "phaser";

// Spec v2 §12 — Phaser game configuration. The canvas resizes to its parent
// container so it works across the responsive breakpoints in §14. The scene is
// added with data by GameScreen (so init() always receives MazeSceneData).
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#fde8ff",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    render: { antialias: true, pixelArt: false },
  };
}
