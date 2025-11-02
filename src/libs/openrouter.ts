import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import "dotenv/config";

export const maxDuration = 30;
export const TOOL_BUDGET = 6;

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not defined in environment variables.");
}

export const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
