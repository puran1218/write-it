/** hanzi-writer 实例工厂 — 主题色在这里统一落地成实体值（SVG 属性不吃 CSS 变量）。 */

import HanziWriter, { type CharacterJson } from "hanzi-writer";
import type { StrokeFile } from "../data";

const THEME = {
  outline: "#2a2520", // --outline：演示笔画 / 用户笔迹
  ghost: "#dcd4c6", // 淡底字轮廓（介于 paper-alt 与 divider）
  skyBlue: "#a8c8f0", // --sky-blue：测验提示高亮
  successGreen: "#7db87d", // --success-green：完成高亮
};

export function createWriter(
  target: HTMLElement,
  character: string,
  data: StrokeFile,
  size: number
): HanziWriter {
  return HanziWriter.create(target, character, {
    charDataLoader: (_char, onComplete) => {
      onComplete(data as unknown as CharacterJson);
    },
    strokeColor: THEME.outline,
    outlineColor: THEME.ghost,
    highlightColor: THEME.skyBlue,
    highlightCompleteColor: THEME.successGreen,
    drawingColor: THEME.outline,
    drawingWidth: Math.max(6, Math.round(size * 0.022)),
    showOutline: true,
    showCharacter: false,
    strokeAnimationSpeed: 0.5, // 演示放慢一倍，方便小朋友看清每一笔
    width: size,
    height: size,
    padding: Math.round(size * 0.07),
  });
}
