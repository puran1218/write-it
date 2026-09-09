/**
 * 说给我听 — Web Speech API 包装，对应 VoiceRecognitionService 的状态机。
 *
 * iOS Safari 提供 webkitSpeechRecognition（主屏 PWA 模式下的可用性需真机
 * 验证，不支持时界面隐藏、文字输入兜底）。识别 zh-CN，2.2 秒静音自动结束，
 * 与 iOS 版的 voiceAutoStopDelay 一致。
 */

export type VoiceLookupState =
  | "idle"
  | "listening"
  | "permission-denied"
  | "no-speech"
  | "failed";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [alternative: number]: { transcript: string };
    };
  };
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const AUTO_STOP_DELAY_MS = 2200;

export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition)
  );
}

export class VoiceLookup {
  private recognition: SpeechRecognitionLike | null = null;
  private autoStopTimer: number | undefined;
  private lastTranscript = "";
  private intentionalStop = false;

  start(handlers: {
    onTranscript: (transcript: string) => void;
    onState: (state: VoiceLookupState) => void;
  }): void {
    this.stop();

    const ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!ctor) {
      handlers.onState("failed");
      return;
    }

    const recognition = new ctor();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    this.lastTranscript = "";
    this.intentionalStop = false;
    this.recognition = recognition;

    const scheduleAutoStop = () => {
      window.clearTimeout(this.autoStopTimer);
      this.autoStopTimer = window.setTimeout(() => recognition.stop(), AUTO_STOP_DELAY_MS);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        transcript += result[0].transcript;
        if (result.isFinal) {
          isFinal = true;
        }
      }
      if (transcript) {
        this.lastTranscript = transcript;
        handlers.onTranscript(transcript);
      }
      if (isFinal) {
        window.clearTimeout(this.autoStopTimer);
        recognition.stop();
        return;
      }
      scheduleAutoStop();
    };

    recognition.onerror = (event) => {
      window.clearTimeout(this.autoStopTimer);
      const reason = event.error;
      handlers.onState(
        reason === "not-allowed" || reason === "service-not-allowed"
          ? "permission-denied"
          : reason === "no-speech" || reason === "aborted"
            ? "no-speech"
            : "failed"
      );
    };

    recognition.onend = () => {
      window.clearTimeout(this.autoStopTimer);
      this.recognition = null;
      // 没听到任何内容也没有报错时（如超时静音），按 no-speech 收尾
      if (!this.lastTranscript && !this.intentionalStop) {
        handlers.onState("no-speech");
      }
    };

    try {
      recognition.start();
      handlers.onState("listening");
    } catch {
      handlers.onState("failed");
    }
  }

  stop(): void {
    this.intentionalStop = true;
    window.clearTimeout(this.autoStopTimer);
    this.recognition?.abort();
    this.recognition = null;
  }
}
