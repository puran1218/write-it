/** 查一查 / 说给我听 — voice lookup + text/pinyin search (port of QuickSearchSheet). */

import { displayPinyin, isChineseCharacter, lookup, searchByPinyin, searchTerm } from "../data";
import type { CharacterPreview } from "../types";
import { goBack, navigate } from "../router";
import { esc, topBarHtml } from "../ui";
import { VoiceLookup, voiceSupported, type VoiceLookupState } from "../voice";

const VOICE_STATUS_TEXT: Record<VoiceLookupState, string> = {
  idle: "点一下麦克风，说出想查的字",
  listening: "在听啦…说吧",
  "permission-denied": "需要允许麦克风才能听你说话，直接打字也可以。",
  "no-speech": "刚刚没有听到清楚的内容，再试一次？",
  failed: "现在暂时不能听你说话，打字也可以。",
};

export async function renderSearch(root: HTMLElement): Promise<void> {
  const withVoice = voiceSupported();
  root.innerHTML = `
    <div class="screen">
      ${topBarHtml()}
      <div class="search-body">
        <h1 class="search-heading">${withVoice ? "点一下，说出来，再选一个字" : "查一个字"}</h1>

        ${
          withVoice
            ? `
        <button class="voice-card" data-action="voice" aria-label="点一下说话查字">
          <span class="voice-mic">🎤</span>
          <span class="voice-status" data-role="voice-status">${VOICE_STATUS_TEXT.idle}</span>
        </button>
        <p class="voice-caption">还可以自己输入</p>`
            : ""
        }

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

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  const input = root.querySelector<HTMLInputElement>(".search-input")!;
  const message = root.querySelector<HTMLElement>(".search-message")!;
  const results = root.querySelector<HTMLElement>(".search-results")!;

  // ---------------------------------------------------------------- 语音输入

  const voice = withVoice ? new VoiceLookup() : null;
  let listening = false;

  function setVoiceStatus(state: VoiceLookupState): void {
    const statusEl = root.querySelector<HTMLElement>('[data-role="voice-status"]');
    if (!statusEl) {
      return;
    }
    statusEl.textContent = VOICE_STATUS_TEXT[state];
    statusEl.classList.toggle("voice-status-listening", state === "listening");
    root.querySelector(".voice-card")?.classList.toggle("voice-card-listening", state === "listening");
  }

  root.querySelector('[data-action="voice"]')?.addEventListener("click", () => {
    if (!voice) {
      return;
    }
    if (listening) {
      listening = false;
      voice.stop();
      setVoiceStatus("idle");
      return;
    }
    listening = true;
    voice.start({
      onTranscript: (transcript) => {
        input.value = transcript;
        void performSearch();
      },
      onState: (state) => {
        setVoiceStatus(state);
        if (state !== "listening") {
          listening = false;
        }
      },
    });
  });

  // ---------------------------------------------------------------- 文字查字

  root.querySelector('[data-action="clear"]')?.addEventListener("click", () => {
    input.value = "";
    results.innerHTML = "";
    message.textContent = "输入汉字或拼音，我来帮你找。";
    input.focus();
  });

  function showPreviews(previews: CharacterPreview[]): void {
    if (previews.length === 0) {
      results.innerHTML = "";
      message.textContent = "没找到这个字，换个说法试试？";
      return;
    }
    message.textContent = "找到啦，点一下看大字。";
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

  let searchRunId = 0;

  async function performSearch(): Promise<void> {
    const id = ++searchRunId;
    const query = input.value.trim();
    if (!query) {
      results.innerHTML = "";
      message.textContent = "输入汉字或拼音，我来帮你找。";
      return;
    }

    const focus = searchTerm(query);
    if (isChineseCharacter(focus)) {
      const info = await lookup(focus);
      if (id !== searchRunId) {
        return; // 已有更新的输入，丢弃旧结果
      }
      if (info.pinyin && info.pinyin !== `${focus}0`) {
        showPreviews([{ character: focus, pinyin: info.pinyin }]);
        return;
      }
      results.innerHTML = "";
      message.textContent = "这个字还没收进来，换个字试试？";
      return;
    }

    const previews = await searchByPinyin(query);
    if (id !== searchRunId) {
      return;
    }
    showPreviews(previews);
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
