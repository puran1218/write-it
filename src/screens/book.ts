/** 字本子 — 成就册：已练会（全彩+✓）/ 看过了（淡色）/ 我的收藏（♥）。 */

import { navigate } from "../router";
import { esc, stickerTilt, tabBarHtml } from "../ui";
import type { LibraryStore } from "../library";

const DISPLAY_LIMIT = 60;

type StickerVariant = "practiced" | "viewed" | "favorite";

export async function renderBook(root: HTMLElement, library: LibraryStore): Promise<void> {
  const state = library.snapshot;
  const practiced = state.practicedCharacters;
  const favorites = state.favoriteCharacters;
  const viewed = state.unlockedCharacters
    .filter((character) => !practiced.includes(character))
    .reverse();

  // 全新用户：一个贴纸都还没有
  if (state.unlockedCharacters.length === 0) {
    root.innerHTML = `
      <div class="screen">
        <header class="book-header"><h1>我的字本子</h1></header>
        <div class="book-empty">
          <p class="book-empty-title">字本子还是空的 ✨</p>
          <p class="book-empty-text">去查一查、练一练，写对的字会变成全彩贴纸贴到这里。</p>
          <button class="action-button action-blue book-empty-cta" data-nav="search">🔍 去查一查</button>
        </div>
        ${tabBarHtml("book")}
      </div>`;
    return;
  }

  function stickerGrid(chars: string[], variant: StickerVariant): string {
    return `
      <div class="sticker-grid">
        ${chars
          .map(
            (character) => `
          <button class="sticker-cell sticker-cell-${variant}" data-character="${esc(character)}"
                  style="--tilt: ${stickerTilt(character)}deg">
            <span class="sticker-char">${esc(character)}</span>
            ${variant === "practiced" ? '<span class="sticker-check">✓</span>' : ""}
            ${variant === "favorite" ? '<span class="sticker-heart">♥</span>' : ""}
          </button>`
          )
          .join("")}
      </div>`;
  }

  function sectionHtml(
    title: string,
    caption: string,
    chars: string[],
    variant: StickerVariant,
    emptyHint = ""
  ): string {
    if (chars.length === 0) {
      return emptyHint
        ? `
        <section class="book-section">
          <header class="book-section-header"><h2>${esc(title)}</h2></header>
          <div class="sticker-grid sticker-grid-empty"><span class="sticker-empty-hint">${esc(emptyHint)}</span></div>
        </section>`
        : "";
    }
    return `
      <section class="book-section">
        <header class="book-section-header">
          <h2>${esc(title)}</h2>
          <span>${caption}</span>
        </header>
        ${stickerGrid(chars.slice(0, DISPLAY_LIMIT), variant)}
      </section>`;
  }

  root.innerHTML = `
    <div class="screen">
      <header class="book-header">
        <h1>我的字本子</h1>
        <span class="book-count">已练 ${practiced.length} · 看过 ${state.unlockedCharacters.length}</span>
      </header>

      <div class="book-sections">
        ${sectionHtml(
          "✓ 已练会",
          "写对过",
          practiced,
          "practiced",
          "在练一练里完整写对的字，会变成全彩贴纸贴在这里"
        )}
        ${favorites.length > 0 ? sectionHtml("♥ 我的收藏", "喜欢", favorites, "favorite") : ""}
        ${sectionHtml("看过了", "打开过详情", viewed, "viewed")}
      </div>

      ${tabBarHtml("book")}
    </div>`;

  for (const cell of root.querySelectorAll<HTMLButtonElement>(".sticker-cell[data-character]")) {
    cell.addEventListener("click", () => {
      navigate({ screen: "detail", character: cell.dataset.character ?? "" });
    });
  }
}
