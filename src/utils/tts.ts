import { elevenlabs } from "@/libs/elevenlabs";
import {
  experimental_generateSpeech as generateSpeech,
  type Experimental_SpeechResult as SpeechResult,
} from "ai";

export async function textToSpeech(text: string): Promise<SpeechResult> {
  if (!process.env.VOICE_ID) {
    throw new Error("VOICE_ID is not defined in environment variables.");
  }
  const speech = await generateSpeech({
    text,
    voice: process.env.VOICE_ID,
    model: elevenlabs.speech("eleven_v3"),
    outputFormat: "mp3",
  });
  return speech;
}
