// app/api/generate/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

// OpenAI 클라이언트
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// 모국어 코드 → 이름 (설명용)
const LANG_NAME = {
  ko: "Korean (Hangul)",
  en: "English (Latin alphabet)",
  fr: "French (Latin alphabet)",
  es: "Spanish (Latin alphabet)",
  ru: "Russian (Cyrillic alphabet)",
};

// 모국어별 발음 표기 규칙 (⚠ 타입 전부 뺌)
function buildPronGuide(nativeLang) {
  switch (nativeLang) {
    case "ko":
      return `
Write the pronunciation using only Korean Hangul letters.
Do NOT use Latin letters or IPA.
Do NOT copy the target sentence itself.
Example:
- Target sentence: "Bonjour"
- Pronunciation in Korean: "봉쥬르"
`;
    case "en":
      return `
Write the pronunciation using only the English alphabet (Latin letters).
Do NOT use Korean Hangul or any non-Latin script.
Do NOT translate the sentence, only show how it sounds.
The output MUST look like a romanization, not the original sentence.
Example:
- Target sentence: "집에 가고 싶었어요."
- Correct: "jibe gago sipeosseoyo"
- Wrong: "집에 가고 싶었어요."
`;
    case "fr":
      return `
Write the pronunciation using only normal French spelling (Latin letters).
Do NOT use Korean Hangul or IPA.
Do NOT translate the sentence, only show how it sounds.
`;
    case "es":
      return `
Write the pronunciation using only normal Spanish spelling (Latin letters).
Do NOT use Korean Hangul or IPA.
Do NOT translate the sentence, only show how it sounds.
`;
    case "ru":
      return `
Write the pronunciation using only Russian Cyrillic letters.
Do NOT use Latin letters or IPA.
Do NOT translate the sentence, only show how it sounds.
Example:
- Target sentence: "hello"
- Pronunciation in Russian: "хэлоу"
`;
    default:
      return `
Write the pronunciation using the user's native writing system.
Do NOT use IPA and do NOT translate.
If the native language uses a Latin alphabet, use only Latin letters.
`;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const nativeText = body.nativeText;
    const nativeLang = body.nativeLang;
    const targetLang = body.targetLang;

    if (!nativeText || !nativeLang || !targetLang) {
      return NextResponse.json(
        { error: "Missing nativeText, nativeLang or targetLang" },
        { status: 400 }
      );
    }

    const nativeName =
      LANG_NAME[nativeLang] ||
      "the user's native language (writing system)";
    const targetName =
      LANG_NAME[targetLang] ||
      "the target language (writing system)";
    const pronGuide = buildPronGuide(nativeLang);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are a helpful language tutor.

Given:
- user's native language: ${nativeName} (code: ${nativeLang})
- target language: ${targetName} (code: ${targetLang})

Task:
1. Create ONE natural, CEFR A2–B1 level sentence in the TARGET language (${targetName}),
   that would be a reasonable response to the user's original sentence.
2. Provide a pronunciation guide for that sentence, written in the USER'S NATIVE LANGUAGE writing system (${nativeName}).

VERY IMPORTANT for pronunciation:
${pronGuide}

Rules:
- "sentence" MUST be written in the target language (${targetName}).
- "pron_native" MUST represent how "sentence" sounds, written in the native language writing system.
- "pron_native" MUST NOT be identical to "sentence".
- "pron_native" MUST NOT be a translation. It is only how the sentence sounds.
- Do NOT include IPA symbols.
- Return ONLY a JSON object like:
  {
    "sentence": "...",       // sentence in the target language
    "pron_native": "..."     // pronunciation written in the native language writing system
  }
`.trim(),
        },
        {
          role: "user",
          content: `
Native language code: ${nativeLang}
Target language code: ${targetLang}

User's original sentence in native language:
${nativeText}
`.trim(),
        },
      ],
    });

    const content = completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content;

    if (!content) {
      return NextResponse.json(
        { error: "No content from OpenAI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      sentence: parsed.sentence || "",
      pron_native: parsed.pron_native || "",
    });
  } catch (err) {
    console.error("Generate API error:", err);
    return NextResponse.json(
      { error: "Generate API server error" },
      { status: 500 }
    );
  }
}
