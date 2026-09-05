/**
 * SVG stroke rendering + "reveal along the median" playback.
 *
 * Web twin of StrokeAnimationView / StrokeScreenView / StrokePlaybackEngine:
 * makemeahanzi paths live in a 1024×1024 box with Y pointing up, so everything
 * is drawn inside a flipped group. A stroke is revealed by masking its filled
 * shape with a thick median line whose dash offset animates to 0 — the same
 * trick the iOS app does with a stroked-path clip mask.
 */

import type { StrokeMedianPoint, StrokeSegment } from "../types";

const SOURCE_SIZE = 1024;
const LINE_WIDTH = 44; // ≈ iOS 12pt on a 280pt canvas

let sceneCounter = 0;

function medianLength(points: StrokeMedianPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return total;
}

function medianPathD(points: StrokeMedianPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  const parts = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  );
  return parts.join(" ");
}

function pointAtProgress(points: StrokeMedianPoint[], progress: number): StrokeMedianPoint {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  const total = medianLength(points);
  const target = Math.max(0, Math.min(1, progress)) * total;
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segment = Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    if (walked + segment >= target) {
      const local = segment === 0 ? 0 : (target - walked) / segment;
      return {
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * local,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * local,
      };
    }
    walked += segment;
  }
  return points[points.length - 1];
}

function trimmedPoints(points: StrokeMedianPoint[], from: number, to: number): StrokeMedianPoint[] {
  const total = medianLength(points);
  const startLength = Math.max(0, from) * total;
  const endLength = Math.min(1, to) * total;
  const result: StrokeMedianPoint[] = [pointAtProgress(points, from / total)];
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const segment = Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    if (walked + segment >= startLength && walked + segment <= endLength) {
      result.push(points[index]);
    }
    walked += segment;
    if (walked >= endLength) {
      break;
    }
  }
  const endPoint = pointAtProgress(points, to);
  result.push(endPoint);
  return result;
}

function revealLineWidth(bounds: DOMRect, points: StrokeMedianPoint[]): number {
  const totalLength = Math.max(medianLength(points), 1);
  const shortSide = Math.max(Math.min(bounds.width, bounds.height), LINE_WIDTH);
  const estimated = Math.max((LINE_WIDTH * 1.4), (bounds.width * bounds.height) / totalLength * 1.25);
  const cap = Math.max(shortSide * 1.3, LINE_WIDTH * 2.4);
  return Math.min(estimated, cap);
}

function svgElement(markup: string): SVGElement {
  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrapper.innerHTML = markup.trim();
  return wrapper.firstElementChild as SVGElement;
}

export interface StrokeScene {
  /** The <svg> element (viewBox 0 0 1024 1024) to drop into the canvas card. */
  readonly el: SVGSVGElement;
  /** Mark the first `count` strokes as fully written. */
  setCompleted(count: number): void;
  /** Animate stroke `index`; resolves when finished or cancelled. */
  playStroke(index: number, speed?: number): Promise<void>;
  /** Clear completed/active strokes (back to ghosts only). */
  reset(): void;
  /** True while a stroke animation is running. */
  readonly isPlaying: boolean;
}

export function createStrokeScene(strokes: StrokeSegment[]): StrokeScene {
  const sceneId = `zi-scene-${(sceneCounter += 1)}`;

  const ghostMarkup = strokes
    .map(
      (stroke) =>
        `<path d="${stroke.path}" fill="var(--outline)" fill-opacity="0.06" stroke="var(--outline)" stroke-opacity="0.04" stroke-width="8" stroke-linejoin="round"/>`
    )
    .join("\n");

  const gridMarkup = `
    <g stroke="var(--sky-blue)" stroke-width="4" fill="none" opacity="1">
      <rect x="20" y="20" width="${SOURCE_SIZE - 40}" height="${SOURCE_SIZE - 40}" stroke-dasharray="18 14"/>
      <path d="M ${SOURCE_SIZE / 2} 20 V ${SOURCE_SIZE - 20}" stroke-dasharray="18 14"/>
      <path d="M 20 ${SOURCE_SIZE / 2} H ${SOURCE_SIZE - 20}" stroke-dasharray="18 14"/>
      <path d="M 20 20 L ${SOURCE_SIZE - 20} ${SOURCE_SIZE - 20}" stroke-dasharray="18 14" opacity="0.6"/>
      <path d="M ${SOURCE_SIZE - 20} 20 L 20 ${SOURCE_SIZE - 20}" stroke-dasharray="18 14" opacity="0.6"/>
    </g>`;

  const el = svgElement(`
    <svg viewBox="0 0 ${SOURCE_SIZE} ${SOURCE_SIZE}" class="zi-stroke-svg">
      <defs><mask id="${sceneId}-reveal" maskUnits="userSpaceOnUse">
        <path id="${sceneId}-mask-path" d="" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"/>
      </mask></defs>
      <g transform="matrix(1 0 0 -1 0 ${SOURCE_SIZE})">
        <g class="zi-tian-grid" opacity="0.28">${gridMarkup}</g>
        <g class="zi-ghost">${ghostMarkup}</g>
        <g class="zi-completed"></g>
        <g class="zi-active" mask="url(#${sceneId}-reveal)"></g>
        <g class="zi-hints"></g>
      </g>
    </svg>
  `) as SVGSVGElement;

  const completedGroup = el.querySelector<SVGGElement>(".zi-completed")!;
  const activeGroup = el.querySelector<SVGGElement>(".zi-active")!;
  const hintsGroup = el.querySelector<SVGGElement>(".zi-hints")!;
  const maskPath = el.querySelector<SVGPathElement>(`#${sceneId}-mask-path`)!;

  let completedCount = 0;
  let animationFrame: number | null = null;
  let cancelled = false;

  function stopAnimation(): void {
    cancelled = true;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  return {
    el,
    get isPlaying() {
      return animationFrame !== null;
    },

    setCompleted(count: number) {
      stopAnimation();
      activeGroup.innerHTML = "";
      hintsGroup.innerHTML = "";
      completedCount = Math.min(Math.max(count, 0), strokes.length);
      completedGroup.innerHTML = strokes
        .slice(0, completedCount)
        .map(
          (stroke) =>
            `<path d="${stroke.path}" fill="var(--outline)" stroke="var(--outline)" stroke-opacity="0.2" stroke-width="3" stroke-linejoin="round"/>`
        )
        .join("\n");
    },

    reset() {
      stopAnimation();
      completedCount = 0;
      completedGroup.innerHTML = "";
      activeGroup.innerHTML = "";
      hintsGroup.innerHTML = "";
    },

    playStroke(index: number, speed = 1) {
      return new Promise<void>((resolve) => {
        stopAnimation();

        const stroke = strokes[index];
        if (!stroke || stroke.medianPoints.length < 2) {
          // No median to reveal along — just drop the finished stroke in.
          this.setCompleted(index + 1);
          resolve();
          return;
        }

        completedGroup.innerHTML = strokes
          .slice(0, completedCount)
          .map(
            (done) =>
              `<path d="${done.path}" fill="var(--outline)" stroke="var(--outline)" stroke-opacity="0.2" stroke-width="3" stroke-linejoin="round"/>`
          )
          .join("\n");

        const points = stroke.medianPoints;
        const totalLength = medianLength(points);
        const shape = svgElement(
          `<path d="${stroke.path}" fill="var(--sky-blue)" stroke="var(--sky-blue)" stroke-width="4" stroke-linejoin="round"/>`
        ) as SVGPathElement;
        activeGroup.innerHTML = "";
        activeGroup.appendChild(shape);

        const bounds = shape.getBBox();
        const revealWidth = revealLineWidth(bounds, points);
        maskPath.setAttribute("d", medianPathD(points));
        maskPath.setAttribute("stroke-width", revealWidth.toFixed(1));
        maskPath.setAttribute("stroke-dasharray", totalLength.toFixed(1));
        maskPath.setAttribute("stroke-dashoffset", totalLength.toFixed(1));

        // 演示提示：起点圆环、笔尖圆点、方向尾迹（对应 iOS 的 marker/head/tail）
        const start = points[0];
        const markerRadius = Math.max(LINE_WIDTH * 1.45, 12) / 2;
        hintsGroup.innerHTML = `
          <g class="zi-start-marker" opacity="0">
            <circle cx="${start.x}" cy="${start.y}" r="${markerRadius}" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="9"/>
            <circle cx="${start.x}" cy="${start.y}" r="${markerRadius}" fill="none" stroke="rgba(43,110,205,0.92)" stroke-width="5"/>
          </g>
          <path class="zi-tail" d="" fill="none" stroke="var(--sky-blue)" stroke-opacity="0.42"
                stroke-width="${Math.max(LINE_WIDTH * 0.34, 3)}" stroke-linecap="round" stroke-linejoin="round"/>
          <circle class="zi-head" r="${LINE_WIDTH * 0.55}" fill="var(--sky-blue)"/>`;

        const startMarker = hintsGroup.querySelector<SVGGElement>(".zi-start-marker")!;
        const tail = hintsGroup.querySelector<SVGPathElement>(".zi-tail")!;
        const head = hintsGroup.querySelector<SVGCircleElement>(".zi-head")!;

        const durationSeconds = (0.18 + Math.max(totalLength, 80) / 260) / Math.max(speed, 0.1);
        const startedAt = performance.now();
        cancelled = false;

        const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

        const frame = (now: number) => {
          if (cancelled || !el.isConnected) {
            resolve();
            return;
          }
          const linear = Math.min((now - startedAt) / (durationSeconds * 1000), 1);
          const progress = easeInOutCubic(linear);

          maskPath.setAttribute("stroke-dashoffset", (totalLength * (1 - progress)).toFixed(1));

          const headPoint = pointAtProgress(points, progress);
          head.setAttribute("cx", headPoint.x.toFixed(1));
          head.setAttribute("cy", headPoint.y.toFixed(1));

          if (progress > 0.02) {
            const tailProgress = Math.min(0.28, Math.max(0.1, 90 / totalLength));
            const tailPoints = trimmedPoints(points, Math.max(0, progress - tailProgress), progress);
            tail.setAttribute("d", medianPathD(tailPoints));
          }

          startMarker.setAttribute("opacity", progress > 0.01 && progress < 0.22 ? "1" : "0");

          if (linear < 1) {
            animationFrame = requestAnimationFrame(frame);
          } else {
            animationFrame = null;
            activeGroup.innerHTML = "";
            hintsGroup.innerHTML = "";
            completedCount = Math.min(index + 1, strokes.length);
            completedGroup.innerHTML = strokes
              .slice(0, completedCount)
              .map(
                (done) =>
                  `<path d="${done.path}" fill="var(--outline)" stroke="var(--outline)" stroke-opacity="0.2" stroke-width="3" stroke-linejoin="round"/>`
              )
              .join("\n");
            resolve();
          }
        };

        animationFrame = requestAnimationFrame(frame);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// 墨点庆祝 — DOM particle port of InkSplatterCelebration.

const SPLATTER_COLORS = ["var(--sky-blue)", "var(--warm-gold)", "var(--mint)", "var(--success-green)"];

export function celebrate(host: HTMLElement): void {
  if (!host.querySelector(".zi-splatter-layer")) {
    const layer = document.createElement("div");
    layer.className = "zi-splatter-layer";
    host.appendChild(layer);
  }
  const layer = host.querySelector<HTMLElement>(".zi-splatter-layer")!;

  const fragment = document.createDocumentFragment();
  const particles: HTMLElement[] = [];
  for (let index = 0; index < 14; index += 1) {
    const particle = document.createElement("span");
    particle.className = "zi-splatter-particle";
    const angle = (Math.PI * 2 * index) / 14 + Math.random() * 0.4;
    const distance = 44 + Math.random() * 52;
    const size = 6 + Math.random() * 9;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = SPLATTER_COLORS[index % SPLATTER_COLORS.length];
    particle.style.left = "50%";
    particle.style.top = "50%";
    particle.animate(
      [
        { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1)`,
          opacity: 1,
        },
      ],
      { duration: 800, delay: Math.random() * 120, easing: "ease-out", fill: "forwards" }
    );
    particles.push(particle);
    fragment.appendChild(particle);
  }
  layer.appendChild(fragment);
  window.setTimeout(() => {
    particles.forEach((particle) => particle.remove());
    if (layer.childElementCount === 0) {
      layer.remove();
    }
  }, 1100);
}
