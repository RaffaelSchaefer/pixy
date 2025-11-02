import { router } from "@/libs/trpc";
import { chat } from "./functions/chat";

export const appRouter = router({
  chat: chat,
});

export type AppRouter = typeof appRouter;
