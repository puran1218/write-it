/** 手写 — port of HandwriteScreenView + HandwriteCanvasView（画布采集 → 600ms 空闲识别 → 候选）。 */

import { displayPinyin } from "../data";
import { recognize, type HandwriteStroke, type StrokePoint } from "../handwrite";
import { goBack, navigate } from "../router";
import { esc } from "../ui";
import { mascotSvg } from "../components/mascot";

const RECOGNIZE_IDLE_MS = 600;

export async function renderHandwrite(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="screen">
      <header class="top-bar">
        <button class="icon-button" data-action="back" aria-label="返回">‹</button>
        <span class="top-bar-title">手写</span>
        <span class="top-bar-spacer"></span>
      </header>

      <div class="handwrite-body">
        <div class="handwrite-mascot-row">
          ${mascotSvg(48, "welcome", "var(--sky-blue)")}
          <div class="speech-bubble" data-role="bubble">先在上面画一个字。</div>
        </div>

        <div class="handwrite-card" data-role="canvas">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="zi-tian-grid-svg hw-grid" aria-hidden="true">
            <g stroke="var(--sky-blue)" stroke-width="1" fill="none" vector-effect="non-scaling-stroke">
              <rect x="6" y="6" width="88" height="88" stroke-dasharray="4 3"/>
              <path d="M 50 6 V 94" stroke-dasharray="4 3"/>
              <path d="M 6 50 H 94" stroke-dasharray="4 3"/>
              <path d="M 6 6 L 94 94" stroke-dasharray="4 3" opacity="0.6"/>
              <path d="M 94 6 L 6 94" stroke-dasharray="4 3" opacity="0.6"/>
            </g>
          </svg>
          <svg class="hw-ink" data-role="ink"></svg>
        </div>

        <div class="handwrite-message-row">
          <span class="handwrite-message" data-role="message">画完我来猜一猜！</span>
          <button class="handwrite-clear" data-action="clear">↺ 清空重来</button>
        </div>

        <div class="handwrite-progress" data-role="progress" hidden>正在猜字…</div>
        <div class="handwrite-candidates" data-role="candidates"></div>
        <button class="handwrite-fallback" data-action="search" hidden>试试拼音输入</button>
      </div>
    </div>`;

  root.querySelector('[data-action="back"]')?.addEventListener("click", goBack);

  const bubble = root.querySelector<HTMLElement>('[data-role="bubble"]')!;
  const canvasCard = root.querySelector<HTMLElement>('[data-role="canvas"]')!;
  const ink = root.querySelector<SVGSVGElement>('[data-role="ink"]')!;
  const message = root.querySelector<HTMLElement>('[data-role="message"]')!;
  const progress = root.querySelector<HTMLElement>('[data-role="progress"]')!;
  const candidatesRow = root.querySelector<HTMLElement>('[data-role="candidates"]')!;
  const fallbackButton = root.querySelector<HTMLButtonElement>('[data-action="search"]')!;

  let strokes: HandwriteStroke[] = [];
  let current: StrokePoint[] = [];
  let activePointer: number | null = null;
  let recognizeTimer: number | undefined;
  let runId = 0;

  function renderInk(): void {
    const toPoints = (stroke: StrokePoint[]) =>
      stroke.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const all = [...strokes, ...(current.length > 0 ? [current] : [])];
    ink.setAttribute("viewBox", `0 0 ${canvasCard.clientWidth} ${canvasCard.clientHeight}`);
    ink.innerHTML = all
      .map(
        (stroke) =>
          `<polyline points="${toPoints(stroke)}" fill="none" stroke="var(--outline)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
      )
      .join("");
  }

  function setBubble(text: string): void {
    bubble.textContent = text;
  }

  function resetMessages(): void {
    message.textContent = "画完我来猜一猜！";
    setBubble("先在上面画一个字。");
    progress.hidden = true;
    candidatesRow.innerHTML = "";
    fallbackButton.hidden = true;
  }

  function clearCanvas(): void {
    window.clearTimeout(recognizeTimer);
    runId += 1;
    strokes = [];
    current = [];
    activePointer = null;
    renderInk();
    resetMessages();
  }

  async function runRecognition(): Promise<void> {
    const id = ++runId;
    resetMessages();
    progress.hidden = false;
    setBubble("我在认真看你的字。");

    try {
      const candidates = await recognize(strokes);
      if (id !== runId || !canvasCard.isConnected) {
        return;
      }
      progress.hidden = true;

      if (candidates.length > 0) {
        message.textContent = "我猜可能是这些，点一个看看。";
        setBubble("我猜到几个，点一个看看！");
        candidatesRow.innerHTML = candidates
          .map(
            (candidate, index) => `
          <button class="handwrite-candidate ${index === 0 ? "handwrite-candidate-first" : ""}"
                  data-character="${esc(candidate.character)}">
            <span class="candidate-char">${esc(candidate.character)}</span>
            <span class="candidate-pinyin">${esc(displayPinyin(candidate.pinyin ?? ""))}</span>
          </button>`
          )
          .join("");
        for (const cell of candidatesRow.querySelectorAll<HTMLButtonElement>(".handwrite-candidate")) {
          cell.addEventListener("click", () => {
            navigate({ screen: "detail", character: cell.dataset.character ?? "" });
          });
        }
      } else {
        message.textContent = "我还不确定，试试再画大一点。";
        setBubble("没关系，我们换个办法也可以。");
        fallbackButton.hidden = false;
      }
    } catch {
      if (id !== runId || !canvasCard.isConnected) {
        return;
      }
      progress.hidden = true;
      message.textContent = "画得太少了，再多画几笔试试。";
      setBubble("没关系，我们换个办法也可以。");
    }
  }

  function scheduleRecognition(): void {
    window.clearTimeout(recognizeTimer);
    recognizeTimer = window.setTimeout(() => void runRecognition(), RECOGNIZE_IDLE_MS);
  }

  function toLocalPoint(event: PointerEvent): StrokePoint {
    const rect = canvasCard.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvasCard.addEventListener("pointerdown", (event) => {
    if (activePointer !== null) {
      return;
    }
    activePointer = event.pointerId;
    current = [toLocalPoint(event)];
    // 合成事件/指针已释放时 capture 会抛 InvalidPointerId，不影响采集
    try {
      canvasCard.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    renderInk();
  });

  canvasCard.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointer) {
      return;
    }
    const point = toLocalPoint(event);
    const last = current[current.length - 1];
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 1.5) {
      return;
    }
    current.push(point);
    renderInk();
  });

  function endStroke(event: PointerEvent): void {
    if (event.pointerId !== activePointer) {
      return;
    }
    activePointer = null;
    current.push(toLocalPoint(event));
    if (current.length > 1) {
      strokes.push(current);
      scheduleRecognition();
    }
    current = [];
    renderInk();
  }

  canvasCard.addEventListener("pointerup", endStroke);
  canvasCard.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activePointer) {
      activePointer = null;
      current = [];
      renderInk();
    }
  });

  root.querySelector('[data-action="clear"]')?.addEventListener("click", clearCanvas);
  root
    .querySelector('[data-action="search"]')
    ?.addEventListener("click", () => navigate({ screen: "search" }));
}
