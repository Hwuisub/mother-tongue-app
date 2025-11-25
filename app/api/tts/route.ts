// app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";

export const runtime = "nodejs";

const client = new textToSpeech.TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}"),
});

export async function POST(req: NextRequest) {
  try {
    const { text, ttsLang } = await req.json();

    // ✅ TTS는 이 두 개만 받는다
    if (!text || !ttsLang) {
      return NextResponse.json(
        { error: "Missing text or ttsLang" },
        { status: 400 }
      );
    }

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: ttsLang, // 예: "en-US", "ko-KR"
        ssmlGender: "NEUTRAL",
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    });

    const audioContent = response.audioContent;
    if (!audioContent) {
      return NextResponse.json(
        { error: "No audio content from Google TTS" },
        { status: 500 }
      );
    }

    const base64 = Buffer.from(
      audioContent as Uint8Array
    ).toString("base64");

    return NextResponse.json({ audioContent: base64 });
  } catch (err) {
    console.error("Google TTS error:", err);
    return NextResponse.json(
      { error: "Google TTS server error" },
      { status: 500 }
    );
  }
}
