"use client";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;
import { useEffect, useRef, useState } from "react";

type Language = {
  code: string;
  label: string;
  ttsLang: string;
};

const LANGUAGES: Language[] = [
  { code: "ko", label: "한국어", ttsLang: "ko-KR" },
  { code: "en", label: "English", ttsLang: "en-US" },
  { code: "fr", label: "Français", ttsLang: "fr-FR" },
  { code: "es", label: "Español", ttsLang: "es-ES" },
  { code: "ru", label: "Русский", ttsLang: "ru-RU" },
];

const QUESTIONS = [
  "오늘 하루는 어떻게 시작했나요?",
  "어제 저녁에는 무엇을 했나요?",
  "휴일에 보통 무엇을 하며 시간을 보내나요?",
];

type Step = "setup" | "practice";

export default function Home() {
  const [nativeLang, setNativeLang] = useState<string>("ko");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [sets, setSets] = useState<number>(2);

  const [step, setStep] = useState<Step>("setup");
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [nativeText, setNativeText] = useState<string>("");
  const [foreignText, setForeignText] = useState<string>("");
  const [foreignPronKo, setForeignPronKo] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const availableTargets = LANGUAGES.filter(
    (lang) => lang.code !== nativeLang
  );

  const handleNativeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNative = e.target.value;
    setNativeLang(newNative);
    const firstTarget = LANGUAGES.find((l) => l.code !== newNative);
    if (firstTarget) setTargetLang(firstTarget.code);
  };

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recog: SpeechRecognition = new SpeechRecognition();
    const langConfig = LANGUAGES.find((l) => l.code === nativeLang);
    recog.lang = langConfig ? langConfig.ttsLang : "ko-KR";
    recog.continuous = false;
    recog.interimResults = false;

    recog.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setNativeText(transcript);
      setIsListening(false);
    };

    recog.onerror = () => {
      setIsListening(false);
    };
    recog.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recog;

    return () => {
      try {
        recog.abort();
      } catch {
        // ignore
      }
    };
  }, [nativeLang]);

  const resetForeignOutputs = () => {
    setForeignText("");
    setForeignPronKo("");
  };

  const startPractice = () => {
    setStep("practice");
    setCurrentIndex(0);
    setNativeText("");
    resetForeignOutputs();
  };

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert("이 브라우저에서는 음성 인식이 지원되지 않습니다.");
      return;
    }
    if (!isListening) {
      setNativeText("");
      resetForeignOutputs();
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // GPT 호출
  const generateForeign = async () => {
    if (!nativeText.trim()) {
      alert("먼저 모국어로 한 문장을 말하거나 적어주세요.");
      return;
    }
    try {
      setIsGenerating(true);
      resetForeignOutputs();

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nativeText,
          nativeLang,
          targetLang,
        }),
      });

      if (!res.ok) {
        console.error("API error", await res.text());
        alert("외국어 문장을 생성하는 중 오류가 발생했습니다.");
        return;
      }

      const data = await res.json();
      setForeignText(data.sentence || "");
      setForeignPronKo(data.pron_ko || "");
    } catch (e) {
      console.error(e);
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playTTS = () => {
    if (!foreignText.trim()) return;
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    const utter = new SpeechSynthesisUtterance(foreignText);
    const langConfig = LANGUAGES.find((l) => l.code === targetLang);
    utter.lang = langConfig ? langConfig.ttsLang : "en-US";
    synth.cancel();
    synth.speak(utter);
  };

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= Math.min(sets, QUESTIONS.length)) {
      alert("오늘 연습이 끝났습니다. 수고하셨어요!");
      setStep("setup");
      setNativeText("");
      resetForeignOutputs();
      return;
    }
    setCurrentIndex(nextIndex);
    setNativeText("");
    resetForeignOutputs();
  };

  // --------- 연습 화면 ---------
  if (step === "practice") {
    const q = QUESTIONS[currentIndex] ?? QUESTIONS[0];

    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-xl">
          <p className="mb-1 text-xs text-gray-500">
            세트 {currentIndex + 1} / {sets}
          </p>
          <h2 className="mb-3 text-2xl font-bold">질문</h2>
          <p className="mb-4 rounded-xl bg-gray-100 p-3 text-sm">{q}</p>

          <div className="mb-4">
            <label className="mb-2 block font-semibold">
              모국어로 편하게 말해보세요
              <span className="ml-1 text-xs text-gray-500">
                (
                {LANGUAGES.find((l) => l.code === nativeLang)?.label ||
                  "모국어"}
                )
              </span>
            </label>
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleMicToggle}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                  isListening ? "bg-red-500" : "bg-gray-900"
                }`}
              >
                {isListening ? "말하기 멈추기" : "🎤 말해서 입력하기"}
              </button>
              <span className="pt-1 text-xs text-gray-500">
                또는 아래 칸에 직접 적어도 됩니다.
              </span>
            </div>
            <textarea
              value={nativeText}
              onChange={(e) => setNativeText(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="여기에 한국어로 한두 문장을 적거나, 말하기 버튼을 눌러 보세요."
            />
          </div>

          <div className="mb-4">
            <button
              type="button"
              onClick={generateForeign}
              disabled={isGenerating}
              className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {isGenerating
                ? "외국어 문장 만드는 중..."
                : "외국어 문장 만들어 보기"}
            </button>
          </div>

          {foreignText && (
            <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">
                  {LANGUAGES.find((l) => l.code === targetLang)?.label ||
                    "외국어"}{" "}
                  문장
                </span>
                <button
                  type="button"
                  onClick={playTTS}
                  className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white"
                >
                  🔊 소리로 듣기
                </button>
              </div>
              <p className="mb-1">{foreignText}</p>
              {foreignPronKo && (
                <p className="mt-1 text-xs text-gray-800">
                  <strong>한국어식 발음:</strong> {foreignPronKo}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("setup");
                setNativeText("");
                resetForeignOutputs();
              }}
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm"
            >
              언어/세트 다시 선택
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              다음 세트로 →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --------- 첫 설정 화면 ---------
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold">
          외국어 말하기, 모국어로 시작하세요
        </h1>
        <p className="mb-6 text-sm text-gray-600 leading-relaxed">
          오늘 연습할 모국어와 목표 언어를 고르고,
          <br />
          몇 세트를 연습할지 선택해 주세요.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold">모국어</label>
          <select
            value={nativeLang}
            onChange={handleNativeChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-sm font-semibold">목표 언어</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {availableTargets.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold">
            오늘은 몇 세트를 연습할까요?
          </label>
          <div className="flex gap-2">
            {[2, 4, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSets(n)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${
                  sets === n
                    ? "border-2 border-gray-900 bg-gray-900 text-white"
                    : "border border-gray-300 bg-white text-gray-900"
                }`}
              >
                {n}세트
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            1세트 ≈ 질문 1개 + 답변 + 외국어 문장 연습
          </p>
        </div>

        <button
          type="button"
          onClick={startPractice}
          className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          연습 시작하기
        </button>
      </div>
    </main>
  );
}
