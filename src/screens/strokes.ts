/** 笔顺演示 — port of StrokeScreenView + StrokePlaybackEngine. */

import { lookup } from "../data";
import { goBack } from "../router";
import { esc, topBarHtml } from "../ui";
import { celebrate, createStrokeScene, type StrokeScene } from "../components/stroke-view";

export async function renderStrokes(root: HTMLElement, character: string): Promise<void> {
  root.innerHTML = `
    <div class="screen">
      ${topBarHtml()}
      <div class="strokes-title-row"><span class="strokes-title">${esc(character)}</span></div>
      <div class="strokes-body">
        <div class="strokes-status" aria-live="polite">准备中…</div>
        <div class="stroke-canvas-card"><div class="strokes-loading">加载中…</div></div>
        <button class="play-button" data-action="play" disabled>▶ 演示笔顺</button>
      </div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  const status = root.querySelector<HTMLElement>(".strokes-status")!;
  const canvasCard = root.querySelector<HTMLElement>(".stroke-canvas-card")!;
  const playButton = root.querySelector<HTMLButtonElement>('[data-action="play"]')!;

  const info = await lookup(character);
  const strokes = info.strokes;
  if (strokes.length === 0) {
    status.textContent = "这个字的笔顺还没收进来。";
    return;
  }

  canvasCard.querySelector(".strokes-loading")?.remove();
  const scene: StrokeScene = createStrokeScene(strokes);
  canvasCard.appendChild(scene.el);

  let completed = 0;
  let playing = false;

  function updateStatus(): void {
    if (playing) {
      status.textContent = `第 ${completed + 1} 笔，共 ${strokes.length} 笔`;
      status.classList.remove("strokes-status-done");
    } else if (completed >= strokes.length) {
      status.textContent = "写完啦！✨";
      status.classList.add("strokes-status-done");
    } else {
      status.textContent = `准备好了吗？一共 ${strokes.length} 笔`;
      status.classList.remove("strokes-status-done");
    }
  }

  async function play(): Promise<void> {
    if (playing) {
      return;
    }
    playing = true;
    playButton.disabled = true;

    if (completed >= strokes.length) {
      completed = 0;
      scene.reset();
      updateStatus();
    }

    for (; completed < strokes.length; completed += 1) {
      updateStatus();
      await scene.playStroke(completed);
      if (!scene.el.isConnected) {
        playing = false;
        return; // 用户已离开本页
      }
    }

    playing = false;
    updateStatus();
    celebrate(canvasCard);
    playButton.disabled = false;
    playButton.textContent = "↺ 再看一遍";
  }

  updateStatus();
  playButton.disabled = false;
  playButton.addEventListener("click", () => void play());
}
