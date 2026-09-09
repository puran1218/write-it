/** 字宝宝吉祥物 — simplified SVG port of ZiBabyMascotView. */

export type MascotMood = "welcome" | "happy";

export function mascotSvg(size: number, mood: MascotMood, fillColor: string): string {
  const eyes =
    mood === "happy"
      ? `<path d="M36 48 q4 -5 8 0" class="zi-mascot-line"/>
         <path d="M56 48 q4 -5 8 0" class="zi-mascot-line"/>`
      : `<circle cx="40" cy="48" r="3" style="fill: var(--outline)"/>
         <circle cx="60" cy="48" r="3" style="fill: var(--outline)"/>`;

  const mouth =
    mood === "happy"
      ? `<path d="M42 60 q8 9 16 0" class="zi-mascot-line"/>`
      : `<path d="M44 60 q6 6 12 0" class="zi-mascot-line"/>`;

  return `
  <svg viewBox="0 0 100 110" width="${size}" height="${Math.round(size * 1.1)}" aria-hidden="true">
    <g class="zi-mascot">
      <path d="M18 66 q-9 4 -10 12" class="zi-mascot-arm"/>
      <path d="M82 66 q9 4 10 12" class="zi-mascot-arm"/>
      <path d="M50 10 q-7 -6 -2 -8" class="zi-mascot-arm" fill="none"/>
      <rect x="10" y="12" width="80" height="80" rx="20"
            style="fill: ${fillColor}; stroke: var(--outline); stroke-width: 2.5px"/>
      <circle cx="33" cy="56" r="4.5" style="fill: var(--mascot-cheek)"/>
      <circle cx="67" cy="56" r="4.5" style="fill: var(--mascot-cheek)"/>
      ${eyes}
      ${mouth}
    </g>
  </svg>`;
}
