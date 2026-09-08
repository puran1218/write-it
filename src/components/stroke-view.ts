/**
 * 田字格参考线 + 墨点庆祝。
 *
 * 笔顺的逐笔动画与描红测验自二期起交给 hanzi-writer（MIT），
 * 这里只保留两块围绕它的自绘 UI。
 */

/** 田字格虚线参考线（1024 视口，虚线样式与 iOS TianGridLines 对齐）。 */
export function tianGridSvg(): string {
  return `
  <svg viewBox="0 0 1024 1024" class="zi-tian-grid-svg" aria-hidden="true">
    <g stroke="var(--sky-blue)" stroke-width="4" fill="none">
      <rect x="20" y="20" width="984" height="984" stroke-dasharray="18 14"/>
      <path d="M 512 20 V 1004" stroke-dasharray="18 14"/>
      <path d="M 20 512 H 1004" stroke-dasharray="18 14"/>
      <path d="M 20 20 L 1004 1004" stroke-dasharray="18 14" opacity="0.6"/>
      <path d="M 1004 20 L 20 1004" stroke-dasharray="18 14" opacity="0.6"/>
    </g>
  </svg>`;
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
