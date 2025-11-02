import { generateChatResponse } from "@/services/chat";
import type { AudioGateway } from "@/utils/realtime/audioGateway";
import { textToSpeech } from "@/utils/tts";
import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";

type BroadcastInput = Parameters<AudioGateway["broadcast"]>[0];

interface StartDiscordBotOptions {
  broadcast?: (payload: BroadcastInput) => void;
}

export async function startDiscordBot(options: StartDiscordBotOptions = {}) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token) {
    console.warn("DISCORD_TOKEN not set. Skipping Discord bot startup.");
    return;
  }

  if (!clientId || !guildId) {
    console.warn(
      "DISCORD_CLIENT_ID or DISCORD_GUILD_ID not set. Discord slash commands will not be registered.",
    );
    return;
  }

  const commands = [
    new SlashCommandBuilder()
      .setName("pixy")
      .setDescription("Send a message to Pixy and get an AI response.")
      .addStringOption(option =>
        option
          .setName("message")
          .setDescription("What would you like to say to Pixy?")
          .setRequired(true),
      )
      .setDMPermission(false),
    new SlashCommandBuilder()
      .setName("pupptier")
      .setDescription("Have Pixy repeat exactly what you say.")
      .addStringOption(option =>
        option.setName("message").setDescription("What should Pixy repeat?").setRequired(true),
      )
      .setDMPermission(false),
  ].map(command => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("Discord slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register Discord slash commands.", error);
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, readyClient => {
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName === "pixy") {
      const message = interaction.options.getString("message", true);

      try {
        await interaction.deferReply();

        const chatResponse = await generateChatResponse(message);

        await interaction.editReply(chatResponse.text);

        options.broadcast?.({
          text: chatResponse.text,
          audio: chatResponse.audio,
          source: "discord",
          command: "pixy",
          author: {
            id: interaction.user.id,
            name: interaction.user.tag,
          },
        });
      } catch (error) {
        console.error("Failed to process Discord command.", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Sorry, I couldn't process that request. Please try again later.",
          );
        } else {
          await interaction.reply({
            content: "Sorry, I couldn't process that request. Please try again later.",
            ephemeral: true,
          });
        }
      }
      return;
    }

    if (interaction.commandName === "pupptier") {
      const message = interaction.options.getString("message", true);

      try {
        await interaction.deferReply();

        const speech = await textToSpeech(message);

        await interaction.editReply(message);

        options.broadcast?.({
          text: message,
          audio: {
            base64: speech.audio.base64,
            mediaType: speech.audio.mediaType,
            format: speech.audio.format,
          },
          source: "discord",
          command: "pupptier",
          author: {
            id: interaction.user.id,
            name: interaction.user.tag,
          },
        });
      } catch (error) {
        console.error("Failed to process puppetier command.", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Sorry, I couldn't process that request. Please try again later.",
          );
        } else {
          await interaction.reply({
            content: "Sorry, I couldn't process that request. Please try again later.",
            ephemeral: true,
          });
        }
      }
    }
  });

  try {
    await client.login(token);
  } catch (error) {
    console.error("Failed to log in to Discord.", error);
  }
}
