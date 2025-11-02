const statusEl = document.querySelector("#status");
const messagesEl = document.querySelector("#messages");
const enableSoundButton = document.querySelector("#enable-sound");
const unhingedToggle = document.querySelector("#unhinged-toggle");
const modeStatusEl = document.querySelector("#mode-status");

let socket;
let reconnectTimer;
let autoplayEnabled = false;
const playbackQueue = [];
let isPlaying = false;
let unhingedMode = false;
let modeUpdateInFlight = false;

const MAX_MESSAGES = 25;

enableSoundButton.addEventListener("click", () => {
  autoplayEnabled = true;
  enableSoundButton.textContent = "Auto-Play Enabled";
  enableSoundButton.disabled = true;
  playNext();
});

function updateStatus(connected) {
  if (!statusEl) return;
  statusEl.textContent = connected ? "Connected" : "Disconnected";
  statusEl.classList.toggle("status--connected", connected);
  statusEl.classList.toggle("status--disconnected", !connected);
}

function base64ToUint8Array(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function updateModeIndicator(active) {
  if (modeStatusEl) {
    modeStatusEl.textContent = active ? "Pixy ist entgleist." : "Pixy ist brav.";
    modeStatusEl.classList.toggle("mode-indicator--chaos", active);
    modeStatusEl.classList.toggle("mode-indicator--calm", !active);
  }

  if (unhingedToggle && unhingedToggle.checked !== active) {
    unhingedToggle.checked = active;
  }
}

function appendMessage(payload, audioUrl) {
  const authorName = payload.author?.name ?? "Pixy";
  const messageEl = document.createElement("article");
  messageEl.className = "message";

  const metaEl = document.createElement("div");
  metaEl.className = "message__meta";
  const metaTextEl = document.createElement("span");
  metaTextEl.className = "message__meta-text";
  metaTextEl.textContent = `${authorName} • ${formatTimestamp(payload.timestamp)}`;
  metaEl.append(metaTextEl);

  if (typeof payload.command === "string" && payload.command.trim() !== "") {
    const commandEl = document.createElement("span");
    const normalizedCommand = payload.command.toLowerCase();
    commandEl.className = `message__command message__command--${normalizedCommand}`;
    commandEl.textContent =
      normalizedCommand === "pixy"
        ? "Pixy"
        : normalizedCommand === "pupptier"
          ? "Puppetier"
          : payload.command;
    metaEl.append(commandEl);
  }
  messageEl.append(metaEl);

  const textEl = document.createElement("div");
  textEl.className = "message__text";
  textEl.textContent = typeof payload.text === "string" ? payload.text : "";
  messageEl.append(textEl);

  if (audioUrl) {
    const audioEl = document.createElement("audio");
    audioEl.className = "message__audio";
    audioEl.controls = true;
    audioEl.src = audioUrl;
    messageEl.append(audioEl);
  }

  messagesEl.prepend(messageEl);

  while (messagesEl.childElementCount > MAX_MESSAGES) {
    messagesEl.lastElementChild?.remove();
  }
}

function enqueuePlayback(audioUrl) {
  playbackQueue.push(audioUrl);
  if (autoplayEnabled && !isPlaying) {
    playNext();
  }
}

function playNext() {
  if (!autoplayEnabled) {
    isPlaying = false;
    return;
  }

  const nextUrl = playbackQueue.shift();
  if (!nextUrl) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const audio = new Audio(nextUrl);
  audio.volume = 1;

  const resetPlayback = () => {
    isPlaying = false;
    playNext();
  };

  audio.addEventListener("ended", resetPlayback, { once: true });
  audio.addEventListener(
    "error",
    () => {
      console.error("Failed to play audio clip.");
      resetPlayback();
    },
    { once: true },
  );

  audio.play().catch(error => {
    console.error("Browser blocked autoplay. Enable audio to listen automatically.", error);
    playbackQueue.unshift(nextUrl);
    isPlaying = false;
  });
}

function handleMessage(event) {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch (error) {
    console.error("Received invalid message.", error);
    return;
  }

  const hasAudio = Boolean(payload.audio && payload.audio.base64);
  let audioUrl = null;

  if (hasAudio) {
    try {
      const bytes = base64ToUint8Array(payload.audio.base64);
      const type = payload.audio.mediaType || "audio/mpeg";
      const blob = new Blob([bytes.buffer], { type });
      audioUrl = URL.createObjectURL(blob);
    } catch (error) {
      console.error("Failed to decode audio payload.", error);
    }
  }

  appendMessage(payload, audioUrl);

  if (audioUrl) {
    enqueuePlayback(audioUrl);
  }
}

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws/audio`;

  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    updateStatus(true);
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  });

  socket.addEventListener("message", handleMessage);

  socket.addEventListener("close", () => {
    updateStatus(false);
    scheduleReconnect();
  });

  socket.addEventListener("error", error => {
    console.error("WebSocket encountered an error.", error);
    socket?.close();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = undefined;
    connectWebSocket();
  }, 3000);
}

connectWebSocket();

initializeModeToggle().catch(error => {
  console.error("Failed to initialize mode toggle.", error);
});

async function initializeModeToggle() {
  if (!unhingedToggle) {
    return;
  }

  try {
    modeUpdateInFlight = true;
    unhingedToggle.disabled = true;
    unhingedMode = await fetchModeState();
    updateModeIndicator(unhingedMode);
  } catch (error) {
    console.error("Failed to fetch mode state.", error);
    updateModeIndicator(unhingedMode);
  } finally {
    modeUpdateInFlight = false;
    if (unhingedToggle) {
      unhingedToggle.disabled = false;
    }
  }

  unhingedToggle.addEventListener("change", async event => {
    const target = event.currentTarget;

    if (!(target instanceof HTMLInputElement) || modeUpdateInFlight) {
      return;
    }

    const desiredState = target.checked;
    modeUpdateInFlight = true;
    target.disabled = true;

    try {
      const persistedState = await persistModeState(desiredState);
      unhingedMode = persistedState;
      updateModeIndicator(unhingedMode);
    } catch (error) {
      console.error("Failed to update mode state.", error);
      target.checked = unhingedMode;
      updateModeIndicator(unhingedMode);
    } finally {
      modeUpdateInFlight = false;
      target.disabled = false;
    }
  });
}

async function fetchModeState() {
  const response = await fetch("/api/mode");

  if (!response.ok) {
    throw new Error(`Failed to fetch mode state: ${response.status}`);
  }

  const data = await response.json();
  return Boolean(data?.unhinged);
}

async function persistModeState(enabled) {
  const response = await fetch("/api/mode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ unhinged: enabled }),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist mode state: ${response.status}`);
  }

  const data = await response.json();
  return Boolean(data?.unhinged);
}
