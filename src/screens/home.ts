/** 首页 — port of HomeScreenView (speech entry becomes 查一查 until 语音 arrives). */

import { recommendedTodayCharacter, starterCharacters } from "../data";
import { navigate } from "../router";
import { esc, tabBarHtml } from "../ui";
import { mascotSvg } from "../components/mascot";
import type { LibraryStore } from "../library";

export async function renderHome(root: HTMLElement, library: LibraryStore): Promise<void> {
  const state = library.snapshot;
  const fallbackStarters = await starterCharacters(6);
  const recent = state.recentCharacters.length > 0 ? state.recentCharacters : fallbackStarters;
  const todayCharacter =
    (await recommendedTodayCharacter(state.recentCharacters)) ?? fallbackStarters[0] ?? "花";

  root.innerHTML = `
    <div class="screen">
      <header class="home-header">
        <span class="app-title">字</span>
        <button class="icon-button" data-nav="book" aria-label="字本子">★</button>
      </header>

      <section class="hero-entry">
        <div class="speech-bubble">想知道哪个字怎么写？说出来，或画给我看。</div>
        ${mascotSvg(78, "welcome", "var(--sky-blue)")}
      </section>

      <section class="entry-cards">
        <button class="entry-card entry-card-gold" data-nav="search">
          <span class="entry-icon-circle">🎤</span>
          <span class="entry-title">说给我听</span>
          <span class="entry-subtitle">说一个字</span>
        </button>
        <button class="entry-card entry-card-blue" data-nav="handwrite">
          <span class="entry-icon-circle">✎</span>
          <span class="entry-title">画给我看</span>
          <span class="entry-subtitle">手指写一写</span>
        </button>
      </section>

      <section class="discovery">
        <button class="today-card" data-action="today">
          <span class="today-text">
            <span class="today-title">今日一字</span>
            <span class="today-subtitle">今天可以先认识它</span>
          </span>
          <span class="today-character">${esc(todayCharacter)}</span>
          <span class="today-arrow">→</span>
        </button>

        <div class="recent-block">
          <h2 class="section-caption">最近查过</h2>
          <div class="recent-chips">
            ${recent
              .map(
                (character) =>
                  `<button class="recent-chip" data-action="char" data-character="${esc(character)}">${esc(character)}</button>`
              )
              .join("")}
          </div>
        </div>
      </section>

      ${tabBarHtml("home")}
    </div>`;

  root.querySelector('[data-action="today"]')?.addEventListener("click", () => {
    if (todayCharacter) {
      navigate({ screen: "detail", character: todayCharacter });
    }
  });

  for (const chip of root.querySelectorAll<HTMLButtonElement>('[data-action="char"]')) {
    chip.addEventListener("click", () => {
      navigate({ screen: "detail", character: chip.dataset.character ?? "" });
    });
  }
}
