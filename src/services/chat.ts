import { getSystemPrompt } from "@/utils/prompts";
import { textToSpeech } from "@/utils/tts";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

export interface ChatResponse {
  text: string;
  audio: {
    base64: string;
    mediaType: string;
    format: string;
  };
}

export async function generateChatResponse(message: string): Promise<ChatResponse> {
  const response = await generateText({
    model: openrouter.chat("x-ai/grok-4-fast"),
    prompt: message,
    system: getSystemPrompt(),
  });

  const tts = await textToSpeech(response.text);

  return {
    text: response.text,
    audio: {
      base64: tts.audio.base64,
      mediaType: tts.audio.mediaType,
      format: tts.audio.format,
    },
  };
}
