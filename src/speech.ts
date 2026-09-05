/** 中文朗读 — web twin of SpeechService (AVSpeechSynthesizer zh-CN, rate 0.45). */

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!speechSupported()) {
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.45;
  const voice = synth
    .getVoices()
    .find((candidate) => candidate.lang === "zh-CN")
    ?? synth.getVoices().find((candidate) => candidate.lang.startsWith("zh"));
  if (voice) {
    utterance.voice = voice;
  }
  synth.speak(utterance);
}
