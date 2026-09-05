/** 查一查 — text/pinyin search (phase-1 twin of QuickSearchSheet). */

import { displayPinyin, isChineseCharacter, lookup, searchByPinyin, searchTerm } from "../data";
import type { CharacterPreview } from "../types";
import { goBack, navigate } from "../router";
import { esc, topBarHtml } from "../ui";

export async function renderSearch(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="screen">
      ${topBarHtml()}
      <div class="search-body">
        <h1 class="search-heading">查一个字</h1>

        <div class="search-input-row">
          <input class="search-input" type="text" inputmode="text"
                 placeholder="例如：花 或 hua" autocomplete="off" autocapitalize="none" />
          <button class="search-clear" data-action="clear" aria-label="清除">✕</button>
        </div>

        <button class="search-submit" data-action="submit">🔍 开始查字</button>
        <p class="search-message">输入汉字或拼音，我来帮你找。</p>

        <div class="search-results" aria-live="polite"></div>
      </div>
    </div>`;

  const input = root.querySelector<HTMLInputElement>(".search-input")!;
  const message = root.querySelector<HTMLElement>(".search-message")!;
  const results = root.querySelector<HTMLElement>(".search-results")!;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);
  root.querySelector('[data-action="clear"]')?.addEventListener("click", () => {
    input.value = "";
    results.innerHTML = "";
    message.textContent = "输入汉字或拼音，我来帮你找。";
    input.focus();
  });

  function showPreviews(previews: CharacterPreview[], pinyinList: string[]): void {
    if (previews.length === 0) {
      results.innerHTML = "";
      message.textContent = "没找到这个字，换个说法试试？";
      return;
    }
    message.textContent = pinyinList.includes("")
      ? "找到啦，点一下看大字。"
      : "找到啦，点一下看大字。";
    results.innerHTML = previews
      .map(
        (preview) => `
        <button class="search-result" data-character="${esc(preview.character)}">
          <span class="result-char">${esc(preview.character)}</span>
          <span class="result-pinyin">${esc(displayPinyin(preview.pinyin))}</span>
        </button>`
      )
      .join("");
    for (const button of results.querySelectorAll<HTMLButtonElement>(".search-result")) {
      button.addEventListener("click", () => {
        navigate({ screen: "detail", character: button.dataset.character ?? "" });
      });
    }
  }

  async function performSearch(): Promise<void> {
    const query = input.value.trim();
    if (!query) {
      results.innerHTML = "";
      message.textContent = "输入汉字或拼音，我来帮你找。";
      return;
    }

    const focus = searchTerm(query);
    if (isChineseCharacter(focus)) {
      const info = await lookup(focus);
      if (info.pinyin && info.pinyin !== `${focus}0`) {
        showPreviews([{ character: focus, pinyin: info.pinyin }], [""]);
        return;
      }
      results.innerHTML = "";
      message.textContent = "这个字还没收进来，换个字试试？";
      return;
    }

    showPreviews(await searchByPinyin(query), []);
  }

  let debounceTimer: number | undefined;
  input.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => void performSearch(), 200);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void performSearch();
    }
  });
  root.querySelector('[data-action="submit"]')?.addEventListener("click", () => void performSearch());

  input.focus();
}
