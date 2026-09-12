/** 写字屏 — 笔顺演示 + 练一练 合并为一个屏幕，顶部固定模式切换。 */

import type { QuizOptions, StrokeData } from "hanzi-writer";
import { loadStrokeFile } from "../data";
import { goBack } from "../router";
import { esc } from "../ui";
import { celebrate, tianGridSvg } from "../components/stroke-view";
import { createWriter } from "../components/writer";
import type { LibraryStore } from "../library";

export type WritingMode = "demo" | "practice";

const DEMO_STATUS_IDLE = (total: number) => `准备好了吗？一共 ${total} 笔`;
const DEMO_STATUS_PLAYING = (current: number, total: number) => `第 ${current} 笔，共 ${total} 笔`;
const DEMO_STATUS_DONE = "写完啦！✨";
const PRACTICE_STATUS_IDLE = "照着淡影，一笔一笔描";

export async function renderWriting(
  root: HTMLElement,
  character: string,
  initialMode: WritingMode,
  library: LibraryStore
): Promise<void> {
  root.innerHTML = `
    <div class="screen">
      <header class="top-bar">
        <button class="icon-button" data-action="back" aria-label="返回">‹</button>
        <span class="top-bar-spacer"></span>
      </header>

      <div class="writing-main">
        <span class="writing-title">${esc(character)}</span>

        <div class="mode-tabs" role="tablist">
          <button class="mode-tab" data-mode="demo" role="tab">✍︎ 笔顺演示</button>
          <button class="mode-tab" data-mode="practice" role="tab">✎ 练一练</button>
        </div>

        <div class="strokes-body" data-role="body">
          <div class="strokes-status" aria-live="polite">准备中…</div>
        </div>
      </div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  const body = root.querySelector<HTMLElement>('[data-role="body"]')!;
  const tabButtons = [...root.querySelectorAll<HTMLButtonElement>(".mode-tab")];

  let mode: WritingMode = initialMode;
  let modeRunId = 0;

  function setMode(next: WritingMode): void {
    if (mode === next) {
      return;
    }
    mode = next;
    modeRunId += 1; // 取消上一个模式的进行中流程
    for (const button of tabButtons) {
      button.classList.toggle("mode-tab-active", button.dataset.mode === mode);
    }
    renderMode();
  }

  for (const button of tabButtons) {
    button.addEventListener("click", () => setMode(button.dataset.mode as WritingMode));
  }

  const data = await loadStrokeFile(character);
  if (!data || data.strokes.length === 0) {
    body.innerHTML = `<div class="strokes-status">这个字的笔顺还没收进来。</div>`;
    return;
  }

  function canvasHtml(): string {
    return `
      <div class="stroke-canvas-card">
        ${tianGridSvg()}
        <div class="writer-target"></div>
      </div>`;
  }

  // ---------------------------------------------------------------- 演示模式

  async function mountDemo(): Promise<void> {
    const id = modeRunId;
    const total = data!.strokes.length;

    body.innerHTML = `
      <div class="strokes-status" aria-live="polite"></div>
      ${canvasHtml()}
      <div class="strokes-actions">
        <button class="action-button action-blue" data-action="play" disabled>▶ 演示笔顺</button>
      </div>`;

    const status = body.querySelector<HTMLElement>(".strokes-status")!;
    const card = body.querySelector<HTMLElement>(".stroke-canvas-card")!;
    const target = body.querySelector<HTMLElement>(".writer-target")!;
    const playButton = body.querySelector<HTMLButtonElement>('[data-action="play"]')!;

    const writer = createWriter(target, character, data!, target.clientWidth);
    let completed = 0;
    let playing = false;

    function updateStatus(): void {
      if (playing) {
        status.textContent = DEMO_STATUS_PLAYING(completed + 1, total);
        status.classList.remove("strokes-status-done");
      } else if (completed >= total) {
        status.textContent = DEMO_STATUS_DONE;
        status.classList.add("strokes-status-done");
      } else {
        status.textContent = DEMO_STATUS_IDLE(total);
        status.classList.remove("strokes-status-done");
      }
    }

    async function play(): Promise<void> {
      if (playing) {
        return;
      }
      playing = true;
      playButton.disabled = true;

      if (completed >= total) {
        completed = 0;
        await writer.hideCharacter({ duration: 200 });
      }

      for (; completed < total; completed += 1) {
        updateStatus();
        await writer.animateStroke(completed);
        if (id !== modeRunId || !target.isConnected) {
          playing = false;
          return;
        }
      }

      playing = false;
      updateStatus();
      celebrate(card);
      playButton.textContent = "↺ 再看一遍";
      playButton.disabled = false;
    }

    updateStatus();
    playButton.disabled = false;
    playButton.addEventListener("click", () => void play());
  }

  // ---------------------------------------------------------------- 练习模式

  async function mountPractice(): Promise<void> {
    const id = modeRunId;
    body.innerHTML = `
      <div class="strokes-status" aria-live="polite">${esc(PRACTICE_STATUS_IDLE)}</div>
      ${canvasHtml()}
      <div class="strokes-actions">
        <button class="action-button action-blue" data-action="replay" disabled>↺ 再练一遍</button>
      </div>`;

    const statusEl = body.querySelector<HTMLElement>(".strokes-status")!;
    const card = body.querySelector<HTMLElement>(".stroke-canvas-card")!;
    const target = body.querySelector<HTMLElement>(".writer-target")!;
    const replayButton = body.querySelector<HTMLButtonElement>('[data-action="replay"]')!;

    const writer = createWriter(target, character, data!, target.clientWidth);

    const quizOptions: Partial<QuizOptions> = {
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      acceptBackwardsStrokes: false,
      onCorrectStroke: (strokeData: StrokeData) => {
        if (id !== modeRunId) return;
        statusEl.classList.remove("strokes-status-done");
        statusEl.textContent =
          strokeData.strokesRemaining > 0
            ? `写对啦！还剩 ${strokeData.strokesRemaining} 笔`
            : "最后一笔写完啦！";
      },
      onMistake: (strokeData: StrokeData) => {
        if (id !== modeRunId) return;
        statusEl.classList.remove("strokes-status-done");
        statusEl.textContent =
          strokeData.mistakesOnStroke >= 2 ? "看看蓝色提示，照着写一次" : "这一笔再试一试 ✋";
      },
      onComplete: (summary: { totalMistakes: number }) => {
        if (id !== modeRunId) return;
        statusEl.textContent =
          summary.totalMistakes === 0
            ? "一次全对！你真棒 ✨"
            : `写好啦！✨（有 ${summary.totalMistakes} 次小失误）`;
        statusEl.classList.add("strokes-status-done");
        celebrate(card);
        library.markPracticed(character); // 字本子：全彩贴纸 + ✓
        replayButton.disabled = false;
      },
    };

    async function startQuiz(): Promise<void> {
      replayButton.disabled = true;
      statusEl.classList.remove("strokes-status-done");
      statusEl.textContent = PRACTICE_STATUS_IDLE;
      await writer.hideCharacter({ duration: 200 });
      writer.quiz(quizOptions);
    }

    void startQuiz();
    replayButton.addEventListener("click", () => void startQuiz());
  }

  function renderMode(): void {
    void (mode === "demo" ? mountDemo() : mountPractice());
  }

  for (const button of tabButtons) {
    button.classList.toggle("mode-tab-active", button.dataset.mode === mode);
  }
  renderMode();
}
