/** 字本子 — port of FavoritesScreenView (curriculum-driven sticker shelves). */

import { bookSections, curriculumCharacterSet } from "../data";
import { navigate } from "../router";
import { esc, stickerTilt, tabBarHtml } from "../ui";
import type { LibraryStore } from "../library";

export async function renderBook(root: HTMLElement, library: LibraryStore): Promise<void> {
  const [sections, curriculumSet] = await Promise.all([bookSections(), curriculumCharacterSet()]);
  const unlocked = new Set(library.snapshot.unlockedCharacters);
  const favorites = new Set(library.snapshot.favoriteCharacters);

  const total = curriculumSet.size;
  const unlockedInCurriculum = [...unlocked].filter((character) => curriculumSet.has(character)).length;
  const progressPercent = total > 0 ? Math.round((unlockedInCurriculum / total) * 100) : 0;

  const sectionHtml = sections
    .map((section) => {
      const unlockedChars = section.characters.filter((character) => unlocked.has(character));
      const placeholders = Math.max(section.characters.length - unlockedChars.length, 0);

      const cells = [
        ...unlockedChars.map(
          (character) => `
        <button class="sticker-cell" data-character="${esc(character)}"
                style="--tilt: ${stickerTilt(character)}deg">
          <span class="sticker-char">${esc(character)}</span>
          ${favorites.has(character) ? '<span class="sticker-heart">♥</span>' : ""}
        </button>`
        ),
        ...Array.from({ length: placeholders }, () => `
        <div class="sticker-cell sticker-cell-locked"><span class="sticker-question">?</span></div>`),
      ].join("");

      return `
      <section class="book-section">
        <header class="book-section-header">
          <h2>${esc(section.title)}</h2>
          <span>${unlockedChars.length}/${section.characters.length}</span>
        </header>
        <div class="sticker-grid">${cells}</div>
      </section>`;
    })
    .join("");

  root.innerHTML = `
    <div class="screen">
      <header class="book-header">
        <h1>我的字本子</h1>
        <span class="book-count">已认 ${unlockedInCurriculum} / ${total} ✨</span>
      </header>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${Math.max(progressPercent, 4)}%"></div>
      </div>
      <div class="book-sections">${sectionHtml}</div>
      ${tabBarHtml("book")}
    </div>`;

  for (const cell of root.querySelectorAll<HTMLButtonElement>(".sticker-cell[data-character]")) {
    cell.addEventListener("click", () => {
      navigate({ screen: "detail", character: cell.dataset.character ?? "" });
    });
  }
}
