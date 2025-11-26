// app/api/generate/route.ts  (또는 route.js)
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

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

// 모국어별 발음 표기 규칙
function buildPronGuide(nativeLang) {
  switch (nativeLang) {
    case "ko":
      return `
Write the pronunciation using only Korean Hangul.
Do NOT use Latin letters or IPA.
Example: "Bonjour" → "봉쥬르"
`;
    case "en":
      return `
Write the pronunciation using only normal English alphabet letters.
Do NOT use Hangul or IPA.
The output must be a romanization, not the original sentence.
Example: "집에 가고 싶었어요." → "jibe gago sipeosseoyo"
`;
    case "fr":
      return `
Write the pronunciation using only French alphabet letters.
Do NOT use Hangul or IPA.
`;
    case "es":
      return `
Write the pronunciation using only Spanish alphabet letters.
Do NOT use Hangul or IPA.
`;
    case "ru":
      return `
Write the pronunciation using only Russian Cyrillic letters.
Do NOT use Latin letters or IPA.
Example: "hello" → "хэлоу"
`;
    default:
      return `
Write the pronunciation using the user's native writing system.
Do NOT translate or use IPA.
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
      LANG_NAME[nativeLang] || "user's native language";
    const targetName =
      LANG_NAME[targetLang] || "target language";
    const pronGuide = buildPronGuide(nativeLang);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are a strict translation engine.

TASK:
1. Translate the user's sentence EXACTLY into ${targetName}.
   - Do NOT create new meaning.
   - Do NOT invent information.
   - Do NOT add extra content.
   - Keep the meaning 100% identical.

2. Then write a pronunciation of the translated sentence
   using ONLY the user's native writing system (${nativeName}).

PRONUNCIATION RULES:
${pronGuide}

OUTPUT FORMAT (JSON only):
{
  "sentence": "<exact translation in target language>",
  "pron_native": "<how it sounds written in user's native writing system>"
}
`.trim(),
        },
        {
          role: "user",
          content: `
Native language: ${nativeLang}
Target language: ${targetLang}

Translate this sentence exactly:
${nativeText}
`.trim(),
        },
      ],
    });

    const content =
      completion.choices[0] &&
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
