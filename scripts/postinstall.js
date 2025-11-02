#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env");
const ENV_TEMPLATE = `#NODE
NODE_ENV=development

#PORTS
WEBSERVER_PORT=3000

#DISCORD BOT
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_GUILD_ID=your-discord-guild-id

#OPENROUTER API
OPENROUTER_API_KEY=your-openrouter-api-key

#ELVENLABS API
ELVENLABS_API_KEY=your-elvenlabs-api-key
`;

try {
  await fs.writeFile(ENV_PATH, ENV_TEMPLATE, { flag: "wx", mode: 0o600 });
  console.info(".env file created 💾");
} catch (err) {
  if (err && err.code === "EEXIST") {
    console.warn("Skipping .env creation (file already exists)");
  } else {
    throw err;
  }
}
