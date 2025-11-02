import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

export interface AudioBroadcastPayload {
  id: string;
  text: string;
  audio: {
    base64: string;
    mediaType: string;
    format: string;
  };
  source: "discord";
  author: {
    id: string;
    name: string;
  };
  timestamp: string;
}

export class AudioGateway {
  private readonly clients = new Set<WebSocket>();

  constructor(server: Server, path = "/ws/audio") {
    const wss = new WebSocketServer({ server, path });

    wss.on("connection", socket => {
      this.clients.add(socket);
      socket.on("close", () => this.clients.delete(socket));
      socket.on("error", () => this.clients.delete(socket));
    });
  }

  broadcast(payload: Omit<AudioBroadcastPayload, "id" | "timestamp">) {
    const message: AudioBroadcastPayload = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...payload,
    };

    const encoded = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(encoded);
      }
    }
  }
}

export function createAudioGateway(server: Server, path?: string) {
  return new AudioGateway(server, path);
}
