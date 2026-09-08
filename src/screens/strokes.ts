/** 笔顺演示 — hanzi-writer 逐笔播放，保住 iOS 版的状态文案与墨点庆祝。 */

import { loadStrokeFile } from "../data";
import { goBack, navigate } from "../router";
import { esc, topBarHtml } from "../ui";
import { celebrate, tianGridSvg } from "../components/stroke-view";
import { createWriter } from "../components/writer";

export async function renderStrokes(root: HTMLElement, character: string): Promise<void> {
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
          <button class="action-button action-blue" data-action="play" disabled>▶ 演示笔顺</button>
          <button class="action-button action-paper" data-action="practice" disabled>✏️ 练一练</button>
        </div>
      </div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  const status = root.querySelector<HTMLElement>(".strokes-status")!;
  const card = root.querySelector<HTMLElement>(".stroke-canvas-card")!;
  const target = root.querySelector<HTMLElement>(".writer-target")!;
  const playButton = root.querySelector<HTMLButtonElement>('[data-action="play"]')!;
  const practiceButton = root.querySelector<HTMLButtonElement>('[data-action="practice"]')!;

  const data = await loadStrokeFile(character);
  if (!data || data.strokes.length === 0 || !target.isConnected) {
    status.textContent = "这个字的笔顺还没收进来。";
    return;
  }

  const writer = createWriter(target, character, data, target.clientWidth);
  const total = data.strokes.length;
  let completed = 0;
  let playing = false;

  function updateStatus(): void {
    if (playing) {
      status.textContent = `第 ${completed + 1} 笔，共 ${total} 笔`;
      status.classList.remove("strokes-status-done");
    } else if (completed >= total) {
      status.textContent = "写完啦！✨";
      status.classList.add("strokes-status-done");
    } else {
      status.textContent = `准备好了吗？一共 ${total} 笔`;
      status.classList.remove("strokes-status-done");
    }
  }

  async function play(): Promise<void> {
    if (playing) {
      return;
    }
    playing = true;
    playButton.disabled = true;
    practiceButton.disabled = true;

    if (completed >= total) {
      completed = 0;
      await writer.hideCharacter({ duration: 200 });
    }

    for (; completed < total; completed += 1) {
      updateStatus();
      await writer.animateStroke(completed);
      if (!target.isConnected) {
        playing = false;
        return; // 用户已离开本页
      }
    }

    playing = false;
    updateStatus();
    celebrate(card);
    playButton.textContent = "↺ 再看一遍";
    playButton.disabled = false;
    practiceButton.disabled = false;
  }

  updateStatus();
  playButton.disabled = false;
  practiceButton.disabled = false;
  playButton.addEventListener("click", () => void play());
  practiceButton.addEventListener("click", () => navigate({ screen: "practice", character }));
}
