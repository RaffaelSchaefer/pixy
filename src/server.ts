import { createServer } from "node:http";

import { startDiscordBot } from "@/libs/discord";
import { getModeState, setUnhingedMode } from "@/state/mode";
import { createAudioGateway } from "@/utils/realtime/audioGateway";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import "dotenv/config";
import express from "express";
import open from "open";

import { appRouter } from "./router";

const PORT = process.env.WEBSERVER_PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  }),
);
app.use(express.static("public"));

app.get("/api/mode", (_req, res) => {
  res.json(getModeState());
});

app.post("/api/mode", (req, res) => {
  const { unhinged } = req.body ?? {};

  if (typeof unhinged !== "boolean") {
    res.status(400).json({ error: "Invalid mode value. Expected boolean 'unhinged'." });
    return;
  }

  setUnhingedMode(unhinged);

  res.json(getModeState());
});

const server = createServer(app);
const audioGateway = createAudioGateway(server);

startDiscordBot({
  broadcast: payload => audioGateway.broadcast(payload),
}).catch(error => {
  console.error("Discord bot failed to start.", error);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  if (process.env.NODE_ENV === "production") {
    open(`http://localhost:${PORT}`).catch(error =>
      console.error("Failed to open browser window.", error),
    );
  }
});
