import { createElevenLabs } from "@ai-sdk/elevenlabs";
import "dotenv/config";

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not defined in environment variables.");
}

export const elevenlabs = createElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY,
});
