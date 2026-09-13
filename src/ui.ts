/** Small shared DOM helpers. */

export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function topBarHtml(): string {
  return `
    <header class="top-bar">
      <button class="icon-button" data-action="back" aria-label="返回">‹</button>
      <span class="top-bar-spacer"></span>
    </header>`;
}

export function tabBarHtml(active: "home" | "book"): string {
  return `
    <nav class="tab-bar">
      <button class="tab-button ${active === "home" ? "tab-button-active" : ""}" data-nav="home">
        <span class="tab-icon">🔍</span><span class="tab-label">找字</span>
      </button>
      <button class="tab-button ${active === "book" ? "tab-button-active" : ""}" data-nav="book">
        <span class="tab-icon">★</span><span class="tab-label">字本子</span>
      </button>
    </nav>`;
}

/** Deterministic sticker tilt: same character always tilts the same way (±4°). */
export function stickerTilt(character: string): number {
  let hash = 0;
  for (const char of character) {
    hash = (hash + (char.codePointAt(0) ?? 0)) | 0;
  }
  return (Math.abs(hash) % 9) - 4;
}
