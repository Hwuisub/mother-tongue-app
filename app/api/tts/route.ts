// app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";

export const runtime = "nodejs"; // Node 환경에서 돌게 강제

const client = new textToSpeech.TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
});


export async function POST(req: NextRequest) {
  try {
    const { text, ttsLang } = await req.json();

    if (!text || !ttsLang) {
      return NextResponse.json(
        { error: "Missing text or ttsLang" },
        { status: 400 }
      );
    }

    // Google Cloud TTS 요청
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: ttsLang, // 예: "fr-FR", "en-US"
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

    // Node Buffer → base64 문자열로 변환해서 반환
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
