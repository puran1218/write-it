/** 练一练 — hanzi-writer 描红测验（笔顺 + 方向判定，错两次出蓝色提示）。 */

import { loadStrokeFile } from "../data";
import { goBack, navigate } from "../router";
import { esc, topBarHtml } from "../ui";
import { celebrate, tianGridSvg } from "../components/stroke-view";
import { createWriter } from "../components/writer";
import type { QuizOptions, StrokeData } from "hanzi-writer";

export async function renderPractice(root: HTMLElement, character: string): Promise<void> {
  root.innerHTML = `
    <div class="screen">
      ${topBarHtml()}
      <div class="strokes-title-row"><span class="strokes-title">${esc(character)}</span></div>
      <div class="strokes-body">
        <div class="strokes-status" aria-live="polite">准备中…</div>
        <div class="stroke-canvas-card">
          ${tianGridSvg()}
          <div class="writer-target"></div>
        </div>
        <div class="strokes-actions">
          <button class="action-button action-paper" data-action="replay" disabled>↺ 再练一遍</button>
          <button class="action-button action-blue" data-action="strokes">▶ 看笔顺</button>
        </div>
      </div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  const status = root.querySelector<HTMLElement>(".strokes-status")!;
  const card = root.querySelector<HTMLElement>(".stroke-canvas-card")!;
  const target = root.querySelector<HTMLElement>(".writer-target")!;
  const replayButton = root.querySelector<HTMLButtonElement>('[data-action="replay"]')!;

  const data = await loadStrokeFile(character);
  if (!data || data.strokes.length === 0 || !target.isConnected) {
    status.textContent = "这个字的练习还没收进来，先去看看笔顺吧。";
    return;
  }

  const writer = createWriter(target, character, data, target.clientWidth);

  function setStatus(text: string): void {
    status.textContent = text;
  }

  function resetStatus(): void {
    status.classList.remove("strokes-status-done");
    setStatus("照着淡影，一笔一笔描");
  }

  const quizOptions: Partial<QuizOptions> = {
    showHintAfterMisses: 2,
    highlightOnComplete: true,
    acceptBackwardsStrokes: false,
    onCorrectStroke: (strokeData: StrokeData) => {
      setStatus(
        strokeData.strokesRemaining > 0
          ? `写对啦！还剩 ${strokeData.strokesRemaining} 笔`
          : "最后一笔写完啦！"
      );
    },
    onMistake: (strokeData: StrokeData) => {
      setStatus(
        strokeData.mistakesOnStroke >= 2 ? "看看蓝色提示，照着写一次" : "这一笔再试一试 ✋"
      );
    },
    onComplete: (summary: { character: string; totalMistakes: number }) => {
      setStatus(
        summary.totalMistakes === 0
          ? "一次全对！你真棒 ✨"
          : `写好啦！✨（有 ${summary.totalMistakes} 次小失误）`
      );
      status.classList.add("strokes-status-done");
      celebrate(card);
      replayButton.disabled = false;
    },
  };

  async function startQuiz(): Promise<void> {
    replayButton.disabled = true;
    resetStatus();
    await writer.hideCharacter({ duration: 200 });
    writer.quiz(quizOptions);
  }

  resetStatus();
  void startQuiz();
  replayButton.addEventListener("click", () => void startQuiz());
  root
    .querySelector('[data-action="strokes"]')
    ?.addEventListener("click", () => navigate({ screen: "strokes", character }));
}
