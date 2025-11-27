import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are a friendly and patient language exchange partner in a language learning app.

The user has:
- nativeLanguage
- targetLanguage
- mode ("native" or "target")
- userMessage

Behavior Rules:

1) mode = "native"
   - Translate ONLY the user's message into the target language.
   - Must be a full, natural B1-level sentence in the target language.
   - Provide a pronunciation guide of the translated sentence, written using the user's native language spelling system.
   - Encourage pronunciation ATTEMPT warmly (you did NOT hear their voice).
   - Ask exactly ONE follow-up question in the target language.
   - Optionally include a translation of the follow-up question in the native language.

2) mode = "target"
   - Show the user's original sentence (target language).
   - Lightly correct to a natural B1-level sentence (do not over-correct).
   - Explain key corrections briefly in the native language.
   - Provide a pronunciation guide of the corrected sentence, written using the user's native language spelling system.
   - Encourage pronunciation ATTEMPT warmly.
   - Ask exactly ONE follow-up question in the target language.
   - ALWAYS include a translation of the follow-up question in the native language.

JSON Response Format — MUST contain ALL fields:
- mode ( "native" or "target" )
- translated_sentence (string | null)      // native mode only
- original_sentence (string | null)        // target mode only
- corrected_sentence (string | null)       // target mode only
- correction_explanation (string)          // REQUIRED; in native mode use "" (never null)
- pronunciation_praise (string)
- next_question_target (string)
- next_question_native (string | null)     // ALWAYS required in target mode; optional in native mode
- pron_native (string)                     // pronunciation in user's native language spelling

CRITICAL RULES:
- NEVER include anything outside JSON.
- NEVER return markdown.
- NEVER leave required fields empty.
- For fields not used in the current mode, set the value to null (not "" and not "null").
`;

export async function POST(req: NextRequest) {
  try {
    const { mode, nativeLanguage, targetLanguage, userMessage } =
      await req.json();

    const payload = {
      mode,
      nativeLanguage,
      targetLanguage,
      userMessage,
    };

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // 🚀 확정 모델
          max_tokens: 500,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content:
                "Return ONLY JSON. Here is the user input:\n" +
                JSON.stringify(payload),
            },
          ],
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("🔴 RAW OpenAI ERROR =>", errText);
      return NextResponse.json(
        { error: "OPENAI_FAILED", detail: errText },
        { status: 500 }
      );
    }

    const json = await openaiRes.json();
    const content = json.choices?.[0]?.message?.content;

    // 👇 response_format 덕분에 content는 무조건 JSON 문자열
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Conversation API error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
