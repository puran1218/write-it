/** 大字详情 — port of CharacterDetailScreenView. */

import { displayPinyin, lookup } from "../data";
import { goBack, navigate } from "../router";
import { speak } from "../speech";
import { esc, topBarHtml } from "../ui";
import type { CharacterInfo } from "../types";
import type { LibraryStore } from "../library";

export async function renderDetail(root: HTMLElement, character: string, library: LibraryStore): Promise<void> {
  root.innerHTML = `
    <div class="screen">
      ${topBarHtml()}
      <div class="detail-loading">加载中…</div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  let info: CharacterInfo;
  try {
    info = await lookup(character);
  } catch {
    root.querySelector(".detail-loading")!.textContent = "这个字还没收进来，换个字试试？";
    return;
  }

  library.markViewed(character);

  const hasLearning =
    (info.components?.length ?? 0) > 0 ||
    (info.decomposition?.length ?? 0) > 0 ||
    (info.learningHint?.length ?? 0) > 0;
  const hasMeta = info.radical != null || info.structure != null || info.strokeCount > 0;
  const favorite = library.isFavorite(character);

  root.innerHTML = `
    <div class="screen">
      <header class="top-bar">
        <button class="icon-button" data-action="back" aria-label="返回">‹</button>
        <span class="top-bar-spacer"></span>
        <button class="icon-button heart-button ${favorite ? "heart-on" : ""}" data-action="favorite"
                aria-label="收藏">${favorite ? "♥" : "♡"}</button>
      </header>

      <div class="detail-body">
        <div class="hero-card">
          <div class="hero-character">
            <span class="hero-char">${esc(info.character)}</span>
          </div>
          <div class="hero-pinyin">${esc(displayPinyin(info.pinyin))}</div>
          ${info.definition ? `<div class="hero-definition">${esc(info.definition)}</div>` : ""}

          <div class="hero-actions">
            <button class="action-button action-gold" data-action="speak">🔊 读一下</button>
            ${
              info.strokes.length > 0
                ? `<button class="action-button action-blue" data-action="strokes">✍︎ 看怎么写</button>`
                : `<span class="action-button action-disabled">还没有笔顺</span>`
            }
          </div>

          ${
            info.strokes.length === 0
              ? `<p class="hero-note">我先把这个字放大给你看。这个字的笔顺和练习还没收进来。</p>`
              : ""
          }
        </div>

        ${
          hasLearning
            ? `
        <section class="detail-section">
          <h2 class="section-caption">这个字怎么记？</h2>
          <div class="detail-card">
            ${
              info.components?.length
                ? `
            <div class="decompose-block">
              <span class="decompose-caption">可以这样拆</span>
              <div class="decompose-chips">
                ${info.components.map((part) => `<span class="decompose-chip">${esc(part)}</span>`).join("")}
              </div>
            </div>`
                : ""
            }
            ${info.decomposition ? `<p class="learning-line">✂︎ ${esc(info.decomposition)}</p>` : ""}
            ${info.learningHint ? `<p class="learning-line">💡 ${esc(info.learningHint)}</p>` : ""}
          </div>
        </section>`
            : ""
        }

        ${
          info.words.length > 0
            ? `
        <section class="detail-section">
          <h2 class="section-caption">能组什么词？</h2>
          <div class="detail-card">
            <div class="word-chips">
              ${info.words
                .map(
                  (word) => `
              <button class="word-chip" data-speak="${esc(word.w)}">
                <span class="word-text">${esc(word.w)}</span>
                <span class="word-pinyin">${esc(displayPinyin(word.p))}</span>
              </button>`
                )
                .join("")}
            </div>
          </div>
        </section>`
            : ""
        }

        ${
          info.sentences.length > 0
            ? `
        <section class="detail-section">
          <h2 class="section-caption">用一用</h2>
          <div class="detail-card">
            ${info.sentences
              .map(
                (sentence) => `
            <div class="sentence-row">
              <p class="sentence-text">${esc(sentence.s)}</p>
              <button class="sentence-speak" data-speak="${esc(sentence.s)}">🔊 听一下</button>
              <span class="sentence-pinyin">${esc(sentence.p)}</span>
            </div>`
              )
              .join("")}
          </div>
        </section>`
            : ""
        }

        ${
          hasMeta
            ? `
        <section class="detail-section">
          <h2 class="section-caption">多知道一点</h2>
          <div class="detail-card">
            ${[
              info.radical != null ? `<div class="meta-row"><span>部首</span><b>${esc(info.radical)}</b></div>` : "",
              info.structure != null ? `<div class="meta-row"><span>结构</span><b>${esc(info.structure)}</b></div>` : "",
              info.strokeCount > 0 ? `<div class="meta-row"><span>笔画</span><b>${info.strokeCount}画</b></div>` : "",
            ].join("")}
          </div>
        </section>`
            : ""
        }
      </div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);
  root.querySelector('[data-action="strokes"]')?.addEventListener("click", () => {
    navigate({ screen: "strokes", character });
  });
  root.querySelector('[data-action="speak"]')?.addEventListener("click", () => {
    speak(info.character);
  });
  root.querySelector('[data-action="favorite"]')?.addEventListener("click", (event) => {
    library.toggleFavorite(character);
    const button = event.currentTarget as HTMLElement;
    const on = library.isFavorite(character);
    button.classList.toggle("heart-on", on);
    button.textContent = on ? "♥" : "♡";
  });
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-speak]")) {
    button.addEventListener("click", () => speak(button.dataset.speak ?? ""));
  }
}
