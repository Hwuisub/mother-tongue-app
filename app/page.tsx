"use client";

type ConversationAIResponse = {
  mode: "native" | "target";
  translated_sentence?: string;
  original_sentence?: string;
  corrected_sentence?: string;
  correction_explanation?: string;
  pronunciation_praise: string;
  next_question_target: string;
  next_question_native?: string;
  pron_native: string;
  };

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
import { useEffect, useRef, useState } from "react";

type SpeechRecognition = any;

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

// ───────────── 난이도 텍스트 (모국어별) ─────────────
const DIFFICULTY_LABELS: Record<string, { beginner: string; intermediate: string; advanced: string }> = {
  ko: {
    beginner: "초급",
    intermediate: "중급",
    advanced: "고급",
  },
  en: {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  fr: {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  },
  es: {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
  },
  ru: {
    beginner: "Начальный",
    intermediate: "Средний",
    advanced: "Продвинутый",
  },
};
const LABEL_NATIVE_PROMPT: Record<string, string> = {
  ko: "편하게 대답해보세요",
  en: "Answer comfortably",
  fr: "Répondez librement",
  es: "Responde cómodamente",
  ru: "Отвечайте свободно",
};

// ───────────── UI 텍스트 (모국어별) ─────────────
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
  nativePronLabel: string;
  doneMessage: string;
  backToSetup: string;
  nextSet: string;
  repeatQuestTitle: string;
  repeatQuestButton: string;
  repeatQuestDone: string;
  answerLangLabel: string;
  answerNativeSuffix: string;
  answerTargetSuffix: string;
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
      "여기에 한두 문장을 적거나, 말하기 버튼을 눌러 보세요.",
    generateButtonIdle: "외국어 문장 만들어 보기",
    generateButtonLoading: "외국어 문장 만드는 중...",
    foreignSentenceLabel: "외국어 문장",
    listenButton: "🔊 소리로 듣기",
    nativePronLabel: "모국어 발음",
    doneMessage: "오늘 연습이 끝났습니다. 수고하셨어요!",
    backToSetup: "언어/세트 다시 선택",
    nextSet: "다음 세트로 →",
    repeatQuestTitle: "이 문장을 소리 내어 3번 따라 읽어 보세요.",
    repeatQuestButton: "🎤 마이크로 따라 읽기",
    repeatQuestDone: "3번 모두 읽었습니다! 잘하셨어요. 🎉",
    answerLangLabel: "어떤 언어로 대답할까요?",
    answerNativeSuffix: "(모국어)",
    answerTargetSuffix: "(목표 언어)",
  },
  en: {
    setupTitle: "Speak a foreign language, starting from your native one",
    setupSubtitle:
      "Choose your native and target language,\nand how many sets you want to practice today.",
    nativeLabel: "Native language",
    targetLabel: "Target language",
    setsQuestion: "How many sets do you want to practice today?",
    setInfo:
      "1 set ≈ 1 question + answer + practice with the foreign sentence",
    startPractice: "Start practice",
    practiceQuestionTitle: "Question",
    speakButtonIdle: "🎤 Speak to fill in",
    speakButtonActive: "Stop speaking",
    typeInsteadHint: "Or type directly in the box below.",
    inputPlaceholder:
      "Say a sentence in the selected language, or type one here.",
    generateButtonIdle: "Generate a foreign sentence",
    generateButtonLoading: "Generating a foreign sentence...",
    foreignSentenceLabel: "Foreign sentence",
    listenButton: "🔊 Listen",
    nativePronLabel: "Pronunciation in your language",
    doneMessage: "You’ve finished today’s practice. Well done!",
    backToSetup: "Change languages / sets",
    nextSet: "Next set →",
    repeatQuestTitle: "Read this sentence aloud three times.",
    repeatQuestButton: "🎤 Repeat with the mic",
    repeatQuestDone: "You read it three times! Great job. 🎉",
    answerLangLabel: "In which language will you answer?",
    answerNativeSuffix: "(native)",
    answerTargetSuffix: "(target)",
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
      "Dis une phrase dans la langue choisie, ou écris-en une ici.",
    generateButtonIdle: "Créer une phrase en langue étrangère",
    generateButtonLoading:
      "Création de la phrase en langue étrangère...",
    foreignSentenceLabel: "Phrase en langue étrangère",
    listenButton: "🔊 Écouter",
    nativePronLabel: "Prononciation dans ta langue",
    doneMessage:
      "Tu as terminé ta pratique pour aujourd’hui. Bravo !",
    backToSetup: "Changer les langues / séries",
    nextSet: "Série suivante →",
    repeatQuestTitle:
      "Lis cette phrase à voix haute trois fois.",
    repeatQuestButton: "🎤 Répéter avec le micro",
    repeatQuestDone:
      "Tu l’as lue trois fois ! Bravo. 🎉",
    answerLangLabel: "Dans quelle langue veux-tu répondre ?",
    answerNativeSuffix: "(langue maternelle)",
    answerTargetSuffix: "(langue cible)",
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
      "Di una frase en el idioma elegido o escríbela aquí.",
    generateButtonIdle: "Crear una frase en idioma extranjero",
    generateButtonLoading:
      "Creando una frase en idioma extranjero...",
    foreignSentenceLabel: "Frase en idioma extranjero",
    listenButton: "🔊 Escuchar",
    nativePronLabel: "Pronunciación en tu idioma",
    doneMessage:
      "Has terminado la práctica de hoy. ¡Buen trabajo!",
    backToSetup: "Cambiar lenguas / series",
    nextSet: "Siguiente serie →",
    repeatQuestTitle:
      "Lee esta frase en voz alta tres veces.",
    repeatQuestButton: "🎤 Repetir con el micrófono",
    repeatQuestDone:
      "¡La leíste tres veces! Muy bien. 🎉",
    answerLangLabel: "¿En qué idioma vas a responder?",
    answerNativeSuffix: "(lengua materna)",
    answerTargetSuffix: "(idioma meta)",
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
      "Произнеси или напиши фразу на выбранном языке.",
    generateButtonIdle: "Создать фразу на иностранном языке",
    generateButtonLoading:
      "Создаю фразу на иностранном языке...",
    foreignSentenceLabel: "Фраза на иностранном языке",
    listenButton: "🔊 Прослушать",
    nativePronLabel: "Произношение на твоём языке",
    doneMessage:
      "Ты завершил(а) тренировку на сегодня. Отличная работа!",
    backToSetup: "Изменить языки / количество сетов",
    nextSet: "Следующий сет →",
    repeatQuestTitle:
      "Прочитай эту фразу вслух три раза.",
    repeatQuestButton: "🎤 Повторить через микрофон",
    repeatQuestDone:
      "Ты прочитал(а) её три раза! Отличная работа. 🎉",
    answerLangLabel: "На каком языке ты будешь отвечать?",
    answerNativeSuffix: "(родной)",
    answerTargetSuffix: "(целевой)",
  },
};

type Step = "choose-native" | "setup" | "practice";
type AnswerLangMode = "native" | "target";

function base64ToBlob(base64: string, mimeType: string) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array([...byteChars].map((c) => c.charCodeAt(0)));
  return new Blob([bytes], { type: mimeType });
}

export default function Home() {
  const [nativeLang, setNativeLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("en");
  const [answerLang, setAnswerLang] =
    useState<AnswerLangMode>("native");
  const [sets, setSets] = useState(2);
  const [difficulty, setDifficulty] = useState("intermediate");


  const [step, setStep] = useState<Step>("choose-native");
  const [currentIndex, setCurrentIndex] = useState(0);

  const [inputText, setInputText] = useState("");
  const [foreignText, setForeignText] = useState("");
  const [foreignPronNative, setForeignPronNative] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentQuestionNative, setCurrentQuestionNative] = useState("");


  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const finalBufferRef = useRef("");

  const [isRepeatListening, setIsRepeatListening] = useState(false);
  const repeatRecognitionRef =
    useRef<SpeechRecognition | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);

  const questions =
    QUESTIONS_BY_NATIVE[nativeLang] ?? QUESTIONS_BY_NATIVE["ko"];

  const texts = UI_TEXTS[nativeLang] ?? UI_TEXTS["en"];

  const updateNativeLang = (newNative: string) => {
    setNativeLang(newNative);
    // 모국어와 목표 언어가 같아지는 상황 방지
    if (newNative === targetLang) {
      const firstOther = LANGUAGES.find(
        (l) => l.code !== newNative
      );
      if (firstOther) setTargetLang(firstOther.code);
    }
  };

  const [aiResult, setAiResult] = useState<ConversationAIResponse | null>(null);
  const [nextQuestionOverride, setNextQuestionOverride] = useState<string | null>(null);


  // ────────── 1) 말해서 입력용 음성 인식 ──────────
    // ────────── 1) 말해서 입력용 음성 인식 ──────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recog: SpeechRecognition = new SR();
    const answerCode =
      answerLang === "native" ? nativeLang : targetLang;
    const langConfig = LANGUAGES.find(
      (l) => l.code === answerCode
    );

    recog.lang = langConfig ? langConfig.ttsLang : "ko-KR";
    recog.continuous = true;
    recog.interimResults = true; // 부분 인식

    // 한 번 확정된 문장을 따로 쌓아두는 버퍼
    
recog.onresult = (e: any) => {
  let interim = "";
  let latestFinal = "";

  for (let i = 0; i < e.results.length; i++) {
    const transcript = e.results[i][0].transcript.trim();
    if (e.results[i].isFinal) {
      latestFinal = transcript; // 모바일 최종결과는 전체 누적본
    } else {
      interim += transcript + " ";
    }
  }

  // 🔥 모바일 중복 완전 차단: 기존 확정과 비교해 "추가된 부분만" 추출
  if (latestFinal) {
    const prev = finalBufferRef.current;
    if (latestFinal.startsWith(prev)) {
      const extra = latestFinal.slice(prev.length).trim();
      if (extra) {
        finalBufferRef.current = (prev + " " + extra).trim();
      }
    } else {
      // 비정상 흐름 대비
      finalBufferRef.current = latestFinal.trim();
    }
  }

  // 화면 표시 = 확정 + 임시
  const display =
    finalBufferRef.current +
    (interim.trim() ? " " + interim.trim() : "");

  setInputText(display.trim());
};

    recognitionRef.current = recog;

    return () => {
      isListeningRef.current = false;
      try {
        recog.abort();
      } catch {
        // ignore
      }
    };
  }, [nativeLang, targetLang, answerLang]);

  
  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (!isListening) {
    if (isListeningRef.current) return;

    // ⬇ 기존 텍스트는 그대로 두고, 외국어 출력만 초기화
    setForeignText("");
    setForeignPronNative("");
    setRepeatCount(0);

    // ⬇🔥 여기서 버퍼를 "현재 화면에 있는 문장"으로 맞춰 줌
    finalBufferRef.current = inputText.trim();

    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("SpeechRecognition start error:", err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  } else {
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    isListeningRef.current = false;
    setIsListening(false);
  }
  };

    const resetForeignOutputs = () => {
    setForeignText("");
    setForeignPronNative("");
    setAiResult(null); 
  };

  // ────────── 3) 외국어 문장 생성 + 대화 파트너 응답 ──────────
const generateForeign = async () => {
  if (!inputText.trim()) {
    alert("먼저 말하거나 적어 주세요.");
    return;
  }

  try {
    setIsGenerating(true);
    resetForeignOutputs();

   const res = await fetch(`/api/conversation`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: answerLang === "native" ? "native" : "target",
    nativeLanguage: nativeLang,
    targetLanguage: targetLang,
    userMessage: inputText,
    difficulty: difficulty,
    
  }),
});

    if (!res.ok) {
      console.error("API error", await res.text());
      alert("대화 응답을 가져오는 중 오류가 발생했습니다.");
      return;
    }

    const data: ConversationAIResponse = await res.json();
    setAiResult(data);
    if (data.next_question_target) {
  setNextQuestionOverride(data.next_question_target);
}

    // 외국어 문장 표시
    if (data.mode === "native" && data.translated_sentence) {
      setForeignText(data.translated_sentence);
    } else if (data.mode === "target" && data.corrected_sentence) {
      setForeignText(data.corrected_sentence);
    }

    // 발음 표시
    const safePronNative =
  typeof data.pron_native === "string" &&
  data.pron_native.trim().length > 0 &&
  data.pron_native !== "undefined"
    ? data.pron_native
    : "";

setForeignPronNative(safePronNative);

  } catch (e) {
    console.error(e);
    alert("네트워크 오류가 발생했습니다.");
  } finally {
    setIsGenerating(false);
  }
};


// ────────── 4) TTS 재생 ──────────
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
    const blob = base64ToBlob(data.audioContent, "audio/mpeg");
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => URL.revokeObjectURL(url);
    audio.play();
  } catch (e) {
    console.error("TTS fetch error:", e);
    alert("소리를 불러오는 중 오류가 발생했습니다.");
  }
};

const playTTSSlow = async () => {
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
    const blob = base64ToBlob(data.audioContent, "audio/mpeg");
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.playbackRate = 0.5; // 느리게
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play();
  } catch (e) {
    console.error("TTS fetch error:", e);
    alert("소리를 불러오는 중 오류가 발생했습니다.");
  }
};


// ⬇ 이것부터는 원래 그대로 존재해야 하는 goNext
const q = currentQuestion || questions[currentIndex];
// 🆕 세트가 시작될 때 질문 자동 TTS 재생
useEffect(() => {
  if (step !== "practice") return;
  if (!q) return;

  const speak = async () => {
    try {
      const textToSpeak =
      aiResult?.next_question_target || q; // ⭐ 항상 외국어 질문을 TTS
      const langConfig = LANGUAGES.find((l) => l.code === targetLang);
      const ttsLang = langConfig ? langConfig.ttsLang : "en-US";

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiResult?.next_question_target || q,
          ttsLang,
        }),
      });

      const data = await res.json();
      const blob = base64ToBlob(data.audioContent, "audio/mpeg");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    } catch (e) {
      console.error("Auto TTS error:", e);
    }
  };

  speak();
}, [q, step, targetLang]);

const goNext = () => {
  if (!aiResult?.next_question_target) {
    alert("다음 질문을 받지 못했습니다.");
    return;
  }

  const nextIndex = currentIndex + 1;

  // 다음 질문을 화면 상단에 반영
  setCurrentQuestion(aiResult.next_question_target);
  setCurrentQuestionNative(aiResult.next_question_native || "");

  // 모든 세트 완료
  if (nextIndex >= sets) {
    alert(texts.doneMessage);
    setStep("setup");
    setInputText("");
    setNextQuestionOverride(null);
    resetForeignOutputs();
    return;
  }

  // 다음 세트로 이동
  setCurrentIndex(nextIndex);
  setInputText("");
  resetForeignOutputs();
};

// ────────── 화면 1: 모국어 선택 ──────────
  if (step === "choose-native") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold">
            Choose your native language
          </h1>
          <p className="mb-6 text-sm text-gray-600 leading-relaxed">
            We&apos;ll adapt all instructions to this language on
            the next screen.
          </p>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-semibold">
              Native language
            </label>
            <select
              value={nativeLang}
              onChange={(e) => updateNativeLang(e.target.value)}
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

 // ────────── 화면 2: 언어 / 세트 설정 ──────────
if (step === "setup") {
  const labels = DIFFICULTY_LABELS[nativeLang];
  const difficultyOptions = [
    { key: "beginner", label: labels.beginner },
    { key: "intermediate", label: labels.intermediate },
    { key: "advanced", label: labels.advanced }
  ];
  const availableTargets = LANGUAGES.filter((l) => l.code !== nativeLang);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold whitespace-pre-line">
          {texts.setupTitle}
        </h1>
        <p className="mb-6 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {texts.setupSubtitle}
        </p>

        {/* 모국어 선택 */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold">{texts.nativeLabel}</label>
          <select
            value={nativeLang}
            onChange={(e) => updateNativeLang(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* 목표 언어 선택 */}
        <div className="mb-5">
          <label className="mb-1 block text-sm font-semibold">{texts.targetLabel}</label>
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

        {/* 세트 개수 선택 */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold">{texts.setsQuestion}</label>
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

        {/* 난이도 선택 */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold">난이도</label>
          <div className="flex gap-2">
            {difficultyOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDifficulty(key)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${
                  difficulty === key
                    ? "border-2 border-gray-900 bg-gray-900 text-white"
                    : "border border-gray-300 bg-white text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <button
          type="button"
          onClick={() => {
            setStep("practice");
            setCurrentIndex(0);
            setInputText("");
            resetForeignOutputs();
            setCurrentQuestion(QUESTIONS_BY_NATIVE[targetLang][0]);
            setCurrentQuestionNative(QUESTIONS_BY_NATIVE[nativeLang][0]);
            setAiResult({
             next_question_target: QUESTIONS_BY_NATIVE[targetLang][0],
             next_question_native: QUESTIONS_BY_NATIVE[nativeLang][0],   // (같지만 위의 currentQuestionNative와 함께 있어야 함)
           } as any);
          }}
          className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {texts.startPractice}
        </button>
      </div>
    </main>
  );
}

return (
  <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
    <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-xl">
      <p className="mb-1 text-xs text-gray-500">
        세트 {currentIndex + 1} / {sets}
      </p>
      <h2 className="mb-3 text-2xl font-bold">
        {texts.practiceQuestionTitle}
      </h2>

      <div className="mb-4 rounded-xl bg-gray-100 p-3 text-sm">
        {/* 메인 외국어 질문 */}
        <p>{aiResult?.next_question_target || q}</p>

        {/* 모국어 해석 표시 */}
        {currentQuestionNative && (
          <p className="mt-1 text-xs text-gray-500">
            ({currentQuestionNative})
          </p>
        )}
      </div>


        {/* 답변 언어 선택 */}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-semibold">
            {texts.answerLangLabel}
          </label>
          <select
            value={answerLang}
            onChange={(e) =>
              setAnswerLang(e.target.value as AnswerLangMode)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="native">
              {
                LANGUAGES.find((l) => l.code === nativeLang)
                  ?.label
              }{" "}
              {texts.answerNativeSuffix}
            </option>
            <option value="target">
              {
                LANGUAGES.find((l) => l.code === targetLang)
                  ?.label
              }{" "}
              {texts.answerTargetSuffix}
            </option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-semibold">
            {LABEL_NATIVE_PROMPT[nativeLang]}
          </label>

          {/* 말해서 입력하기 버튼 (1개) */}
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleMicToggle}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                isListening ? "bg-red-500" : "bg-gray-900"
              }`}
            >
              {isListening
                ? texts.speakButtonActive
                : texts.speakButtonIdle}
            </button>
            <span className="pt-1 text-xs text-gray-500">
              {texts.typeInsteadHint}
            </span>
          </div>

          {/* 🆕 음성 인식 바 표시 */}
{isListening && (
  <div className="flex gap-1 mt-2">
    <div className="w-1 h-4 bg-blue-500 animate-pulse" />
    <div className="w-1 h-6 bg-blue-500 animate-pulse delay-100" />
    <div className="w-1 h-3 bg-blue-500 animate-pulse delay-200" />
    <div className="w-1 h-5 bg-blue-500 animate-pulse delay-300" />
  </div>
)}

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={playTTS}
          className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white"
        >
          {texts.listenButton}
        </button>

        <button
          type="button"
          onClick={playTTSSlow}
          className="rounded-full bg-indigo-400 px-3 py-1 text-xs text-white"
        >
          🐢 느리게 (0.5×)
        </button>
      </div>
    </div>

    <p className="mb-1">{foreignText}</p>

    {foreignPronNative && (
      <p className="mt-1 text-xs text-gray-800">
        <strong>{texts.nativePronLabel}:</strong>{" "}
        {foreignPronNative}
      </p>
    )}
  </div>
)}


{aiResult && (
  <div className="mb-4 space-y-3 rounded-xl bg-yellow-50 p-4 text-sm text-gray-800">
    
    {/* 목표어 대답 → 교정 & 설명 */}
    {aiResult.mode === "target" && (
      <>
        {aiResult.original_sentence && (
          <div className="rounded-md bg-white p-2">
            <div className="font-semibold mb-1">내 문장</div>
            <div>{aiResult.original_sentence}</div>
          </div>
        )}

        {aiResult.corrected_sentence && (
          <div className="rounded-md bg-white p-2">
            <div className="font-semibold mb-1">교정된 문장</div>
            <div>{aiResult.corrected_sentence}</div>
          </div>
        )}

        {aiResult.correction_explanation && (
          <div className="rounded-md bg-yellow-100 p-2">
            {aiResult.correction_explanation}
          </div>
        )}
      </>
    )}

    {/* 발음 칭찬 */}
    <div className="rounded-md bg-emerald-50 p-2">
      <div className="font-semibold mb-1">발음 피드백</div>
      <div>{aiResult.pronunciation_praise}</div>
    </div>

    {/* 다음 질문 */}
    <div className="rounded-md bg-blue-50 p-2">
      <div className="font-semibold mb-1">다음 질문</div>
      <div className="text-base">{aiResult.next_question_target}</div>
      {aiResult.next_question_native && (
        <div className="mt-1 text-xs text-gray-600">
          ({aiResult.next_question_native})
        </div>
      )}
    </div>

  </div>
)}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setStep("setup");
              setInputText("");
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
