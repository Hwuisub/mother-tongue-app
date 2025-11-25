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

// 모국어별 질문
const QUESTIONS_BY_NATIVE: Record<string, string[]> = {
  ko: [
    "오늘 하루는 어떻게 시작했나요?",
    "어제 저녁에는 무엇을 했나요?",
    "휴일에 보통 무엇을 하며 시간을 보내나요?",
  ],
  en: [
    "How did you start your day today?",
    "What did you do last evening?",
    "What do you usually do on holidays?",
  ],
  fr: [
    "Comment as-tu commencé ta journée aujourd'hui ?",
    "Qu'as-tu fait hier soir ?",
    "Que fais-tu d'habitude pendant les jours fériés ?",
  ],
  es: [
    "¿Cómo empezaste tu día hoy?",
    "¿Qué hiciste anoche?",
    "¿Qué sueles hacer durante los días festivos?",
  ],
  ru: [
    "Как ты начал(а) свой день сегодня?",
    "Что ты делал(а) вчера вечером?",
    "Что ты обычно делаешь в выходные или праздники?",
  ],
};

// 모국어 안내 문구 (언어별)
const LABEL_NATIVE_PROMPT: Record<string, string> = {
  ko: "모국어로 편하게 대답해보세요",
  en: "Answer comfortably in your native language",
  fr: "Répondez librement dans votre langue maternelle",
  es: "Responde cómodamente en tu lengua materna",
  ru: "Отвечайте libreно на своём родном языке",
};

// UI 텍스트 (설정 화면 + 연습 화면, 모국어에 따라 변경)
type UiTexts = {
  setupTitle: string;
  setupSubtitle: string;
  nativeLabel: string;
  targetLabel: string;
  setsQuestion: string;
  setInfo: string;
  startPractice: string;
  practiceQuestionTitle: string;
  speakButtonIdle: string;
  speakButtonActive: string;
  typeInsteadHint: string;
  inputPlaceholder: string;
  generateButtonIdle: string;
  generateButtonLoading: string;
  foreignSentenceLabel: string;
  listenButton: string;
  koreanPronLabel: string;
  doneMessage: string;
  backToSetup: string;
  nextSet: string;
};

const UI_TEXTS: Record<string, UiTexts> = {
  ko: {
    setupTitle: "외국어 말하기, 모국어로 시작하세요",
    setupSubtitle:
      "오늘 연습할 모국어와 목표 언어를 고르고,\n몇 세트를 연습할지 선택해 주세요.",
    nativeLabel: "모국어",
    targetLabel: "목표 언어",
    setsQuestion: "오늘은 몇 세트를 연습할까요?",
    setInfo: "1세트 ≈ 질문 1개 + 답변 + 외국어 문장 연습",
    startPractice: "연습 시작하기",
    practiceQuestionTitle: "질문",
    speakButtonIdle: "🎤 말해서 입력하기",
    speakButtonActive: "말하기 멈추기",
    typeInsteadHint: "또는 아래 칸에 직접 적어도 됩니다.",
    inputPlaceholder:
      "여기에 모국어로 한두 문장을 적거나, 말하기 버튼을 눌러 보세요.",
    generateButtonIdle: "외국어 문장 만들어 보기",
    generateButtonLoading: "외국어 문장 만드는 중...",
    foreignSentenceLabel: "외국어 문장",
    listenButton: "🔊 소리로 듣기",
    koreanPronLabel: "한국어식 발음",
    doneMessage: "오늘 연습이 끝났습니다. 수고하셨어요!",
    backToSetup: "언어/세트 다시 선택",
    nextSet: "다음 세트로 →",
  },
  en: {
    setupTitle: "Speak a foreign language, starting from your native one",
    setupSubtitle:
      "Choose your native and target language,\nand how many sets you want to practice today.",
    nativeLabel: "Native language",
    targetLabel: "Target language",
    setsQuestion: "How many sets do you want to practice today?",
    setInfo: "1 set ≈ 1 question + answer + foreign sentence practice",
    startPractice: "Start practice",
    practiceQuestionTitle: "Question",
    speakButtonIdle: "🎤 Speak to fill in",
    speakButtonActive: "Stop speaking",
    typeInsteadHint: "Or type directly in the box below.",
    inputPlaceholder:
      "Say a sentence in your native language, or type one here.",
    generateButtonIdle: "Generate a foreign sentence",
    generateButtonLoading: "Generating a foreign sentence...",
    foreignSentenceLabel: "Foreign sentence",
    listenButton: "🔊 Listen",
    koreanPronLabel: "Korean-style pronunciation",
    doneMessage: "You’ve finished today’s practice. Well done!",
    backToSetup: "Change languages / sets",
    nextSet: "Next set →",
  },
  fr: {
    setupTitle:
      "Parler une langue étrangère, en partant de ta langue maternelle",
    setupSubtitle:
      "Choisis ta langue maternelle, la langue cible\net le nombre de séries que tu veux pratiquer aujourd’hui.",
    nativeLabel: "Langue maternelle",
    targetLabel: "Langue cible",
    setsQuestion: "Combien de séries veux-tu pratiquer aujourd’hui ?",
    setInfo:
      "1 série ≈ 1 question + réponse + phrase en langue étrangère à pratiquer",
    startPractice: "Commencer la pratique",
    practiceQuestionTitle: "Question",
    speakButtonIdle: "🎤 Parler pour remplir",
    speakButtonActive: "Arrêter de parler",
    typeInsteadHint: "Ou écris directement dans la zone ci-dessous.",
    inputPlaceholder:
      "Dis une phrase dans ta langue maternelle, ou écris-en une ici.",
    generateButtonIdle: "Créer une phrase en langue étrangère",
    generateButtonLoading: "Création de la phrase en langue étrangère...",
    foreignSentenceLabel: "Phrase en langue étrangère",
    listenButton: "🔊 Écouter",
    koreanPronLabel: "Prononciation à la coréenne",
    doneMessage: "Tu as terminé ta pratique pour aujourd’hui. Bravo !",
    backToSetup: "Changer les langues / séries",
    nextSet: "Série suivante →",
  },
  es: {
    setupTitle:
      "Habla un idioma extranjero, empezando por tu lengua materna",
    setupSubtitle:
      "Elige tu lengua materna y el idioma meta,\ny cuántas series quieres practicar hoy.",
    nativeLabel: "Lengua materna",
    targetLabel: "Idioma meta",
    setsQuestion: "¿Cuántas series quieres practicar hoy?",
    setInfo:
      "1 serie ≈ 1 pregunta + respuesta + práctica de la frase en idioma extranjero",
    startPractice: "Empezar la práctica",
    practiceQuestionTitle: "Pregunta",
    speakButtonIdle: "🎤 Habla para rellenar",
    speakButtonActive: "Dejar de hablar",
    typeInsteadHint: "O escribe directamente en el cuadro de abajo.",
    inputPlaceholder:
      "Di una frase en tu lengua materna o escríbela aquí.",
    generateButtonIdle: "Crear una frase en idioma extranjero",
    generateButtonLoading:
      "Creando una frase en idioma extranjero...",
    foreignSentenceLabel: "Frase en idioma extranjero",
    listenButton: "🔊 Escuchar",
    koreanPronLabel: "Pronunciación al estilo coreano",
    doneMessage:
      "Has terminado la práctica de hoy. ¡Buen trabajo!",
    backToSetup: "Cambiar lenguas / series",
    nextSet: "Siguiente serie →",
  },
  ru: {
    setupTitle:
      "Говори на иностранном языке, начиная с родного",
    setupSubtitle:
      "Выбери родной и целевой язык\nи количество сетов для сегодняшней практики.",
    nativeLabel: "Родной язык",
    targetLabel: "Целевой язык",
    setsQuestion:
      "Сколько сетов ты хочешь потренировать сегодня?",
    setInfo:
      "1 сет ≈ 1 вопрос + ответ + тренировка фразы на иностранном языке",
    startPractice: "Начать тренировку",
    practiceQuestionTitle: "Вопрос",
    speakButtonIdle: "🎤 Говори, чтобы заполнить",
    speakButtonActive: "Закончить говорить",
    typeInsteadHint: "Или напиши прямо в поле ниже.",
    inputPlaceholder:
      "Скажи фразу на своём родном языке или напиши её здесь.",
    generateButtonIdle: "Создать фразу на иностранном языке",
    generateButtonLoading:
      "Создаю фразу на иностранном языке...",
    foreignSentenceLabel: "Фраза на иностранном языке",
    listenButton: "🔊 Прослушать",
    koreanPronLabel: "Произношение по-корейски",
    doneMessage:
      "Ты завершил(а) тренировку на сегодня. Отличная работа!",
    backToSetup: "Изменить языки / количество сетов",
    nextSet: "Следующий сет →",
  },
};

type Step = "choose-native" | "setup" | "practice";

function base64ToBlob(base64: string, mimeType: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);

  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default function Home() {
  const [nativeLang, setNativeLang] = useState<string>("ko");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [sets, setSets] = useState<number>(2);

  // 선택된 모국어에 맞는 질문 목록
  const questions =
    QUESTIONS_BY_NATIVE[nativeLang] ?? QUESTIONS_BY_NATIVE["ko"];

  const [step, setStep] = useState<Step>("choose-native");
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [nativeText, setNativeText] = useState<string>("");
  const [foreignText, setForeignText] = useState<string>("");
  const [foreignPronKo, setForeignPronKo] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef<boolean>(false);

  const availableTargets = LANGUAGES.filter(
    (lang) => lang.code !== nativeLang
  );

  const texts = UI_TEXTS[nativeLang] ?? UI_TEXTS["en"];

  const handleNativeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNative = e.target.value;
    setNativeLang(newNative);
    const firstTarget = LANGUAGES.find((l) => l.code !== newNative);
    if (firstTarget) setTargetLang(firstTarget.code);
  };

  // isListening 값을 ref에도 동기화 (계속 듣기용)
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // 음성 인식 초기화 (선택한 모국어에 맞게 + 내가 멈출 때까지 계속 듣기)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      console.warn("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recog: SpeechRecognition = new SR();
    const langConfig = LANGUAGES.find((l) => l.code === nativeLang);
    recog.lang = langConfig ? langConfig.ttsLang : "ko-KR";

    // 계속 듣기
    recog.continuous = true;
    recog.interimResults = false;

    recog.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNativeText(transcript);
      // isListening은 사용자가 버튼으로 끌 때까지 유지
    };

    recog.onerror = () => {
      setIsListening(false);
    };

    recog.onend = () => {
      if (isListeningRef.current) {
        try {
          recog.start();
        } catch {
          setIsListening(false);
        }
      }
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
      alert("이 브라우저에서는 음성 인식을 지원되지 않습니다.");
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

  // Google TTS 호출 후 재생
  const playTTS = async () => {
    if (!foreignText.trim()) return;

    try {
      const langConfig = LANGUAGES.find((l) => l.code === targetLang);
      const ttsLang = langConfig ? langConfig.ttsLang : "en-US";

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: foreignText,
          ttsLang,
        }),
      });

      if (!res.ok) {
        console.error("TTS API error:", await res.text());
        alert("소리를 불러오는 중 오류가 발생했습니다.");
        return;
      }

      const data = await res.json();
      const base64 = data.audioContent as string;

      if (!base64) {
        alert("TTS 응답에 음성 데이터가 없습니다.");
        return;
      }

      const blob = base64ToBlob(base64, "audio/mpeg");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    } catch (e) {
      console.error("TTS fetch error:", e);
      alert("소리를 불러오는 중 오류가 발생했습니다.");
    }
  };

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= Math.min(sets, questions.length)) {
      alert(texts.doneMessage);
      setStep("setup");
      setNativeText("");
      resetForeignOutputs();
      return;
    }
    setCurrentIndex(nextIndex);
    setNativeText("");
    resetForeignOutputs();
  };

  // --------- 첫 화면: 모국어 선택 (UI는 일단 영어로) ---------
  if (step === "choose-native") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold">
            Choose your native language
          </h1>
          <p className="mb-6 text-sm text-gray-600 leading-relaxed">
            We&apos;ll adapt all instructions to this language on the next
            screen.
          </p>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-semibold">
              Native language
            </label>
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

          <button
            type="button"
            onClick={() => setStep("setup")}
            className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Next
          </button>
        </div>
      </main>
    );
  }

  // --------- 두 번째 화면: 언어/세트 설정 (모든 글이 모국어) ---------
  if (step === "setup") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold whitespace-pre-line">
            {texts.setupTitle}
          </h1>
          <p className="mb-6 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {texts.setupSubtitle}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold">
              {texts.nativeLabel}
            </label>
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
            <label className="mb-1 block text-sm font-semibold">
              {texts.targetLabel}
            </label>
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
              {texts.setsQuestion}
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
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">{texts.setInfo}</p>
          </div>

          <button
            type="button"
            onClick={startPractice}
            className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {texts.startPractice}
          </button>
        </div>
      </main>
    );
  }

  // --------- 연습 화면 ---------
  if (step === "practice") {
    const q = questions[currentIndex] ?? questions[0];

    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-xl">
          <p className="mb-1 text-xs text-gray-500">
            세트 {currentIndex + 1} / {sets}
          </p>
          <h2 className="mb-3 text-2xl font-bold">
            {texts.practiceQuestionTitle}
          </h2>
          <p className="mb-4 rounded-xl bg-gray-100 p-3 text-sm">{q}</p>

          <div className="mb-4">
            <label className="mb-2 block font-semibold">
              {LABEL_NATIVE_PROMPT[nativeLang]}
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
                {isListening ? texts.speakButtonActive : texts.speakButtonIdle}
              </button>
              <span className="pt-1 text-xs text-gray-500">
                {texts.typeInsteadHint}
              </span>
            </div>
            <textarea
              value={nativeText}
              onChange={(e) => setNativeText(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={texts.inputPlaceholder}
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
                ? texts.generateButtonLoading
                : texts.generateButtonIdle}
            </button>
          </div>

          {foreignText && (
            <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">
                  {texts.foreignSentenceLabel}
                </span>
                <button
                  type="button"
                  onClick={playTTS}
                  className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white"
                >
                  {texts.listenButton}
                </button>
              </div>
              <p className="mb-1">{foreignText}</p>
              {foreignPronKo && (
                <p className="mt-1 text-xs text-gray-800">
                  <strong>{texts.koreanPronLabel}:</strong> {foreignPronKo}
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
              {texts.backToSetup}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {texts.nextSet}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 이론상 여기까지 오지 않지만, 타입 안전용 fallback
  return null;
}
