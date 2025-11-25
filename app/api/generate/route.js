import { NextRequest, NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { nativeText, nativeLang, targetLang } = await req.json();

    if (!nativeText || !targetLang) {
      return NextResponse.json(
        { error: "Missing nativeText or targetLang" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const prompt = `
당신은 한국인 학습자를 도와주는 언어 선생님입니다.

- 학습자의 모국어: ${nativeLang}
- 목표 언어: ${targetLang}
- 학습자가 말한 문장: "${nativeText}"

1) 먼저 목표 언어(${targetLang})로 자연스럽고 너무 길지 않은 문장 하나를 만들어 주세요.
2) 그 문장을 한국어식 발음으로 적어 주세요. (한글만 사용)

반환 형식(JSON):
{"sentence": "예시", "pron_ko": "예시"}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "OpenAI API error", detail: text },
        { status: 500 }
      );
    }

    const data = await response.json();

    let parsed = { sentence: "", pron_ko: "" };

    try {
      const content = data.choices?.[0]?.message?.content ?? "";
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Server error while generating sentence" },
      { status: 500 }
    );
  }
}
