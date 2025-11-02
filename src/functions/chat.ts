import { publicProcedure } from "@/libs/trpc";
import { generateChatResponse } from "@/services/chat";
import { z } from "zod";

export const chat = publicProcedure
  .input(
    z.object({
      message: z.string().min(1, "Message is required."),
    }),
  )
  .mutation(async ({ input }) => {
    return generateChatResponse(input.message);
  });
