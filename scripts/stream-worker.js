const { PrismaClient } = require("@prisma/client");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const db = new PrismaClient();

const STORAGE_DIR = path.join(process.cwd(), "storage");
const PLAYLISTS_DIR = path.join(STORAGE_DIR, "playlists");
const LOGS_DIR = path.join(STORAGE_DIR, "logs");

fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
fs.mkdirSync(LOGS_DIR, { recursive: true });

const POLL_MS = parseInt(process.env.STREAM_WORKER_POLL_MS || "15000", 10);
const HEARTBEAT_STALE_MS = parseInt(process.env.STREAM_HEARTBEAT_STALE_MS || "45000", 10);
const CLAIM_TIMEOUT_MS = parseInt(process.env.STREAM_CLAIM_TIMEOUT_MS || "120000", 10);
const WORKER_ID = `${os.hostname()}:${process.pid}`;

const activeProcesses = new Map();
const heartbeatIntervals = new Map();
const reconnectTimeouts = new Map();

function createClaimToken() {
  return `worker-claim:${WORKER_ID}:${Date.now()}`;
}

function isClaimToken(value) {
  return typeof value === "string" && value.startsWith("worker-claim:");
}

function getPlaylistPath(streamId) {
  return path.join(PLAYLISTS_DIR, `${streamId}.txt`);
}

function clearReconnect(streamId) {
  const timeout = reconnectTimeouts.get(streamId);
  if (timeout) {
    clearTimeout(timeout);
    reconnectTimeouts.delete(streamId);
  }
}

function clearHeartbeat(streamId) {
  const interval = heartbeatIntervals.get(streamId);
  if (interval) {
    clearInterval(interval);
    heartbeatIntervals.delete(streamId);
  }
}

function cleanupPlaylistFile(streamId) {
  try {
    const playlistPath = getPlaylistPath(streamId);
    if (fs.existsSync(playlistPath)) {
      fs.unlinkSync(playlistPath);
    }
  } catch (_) {}
}

async function logEvent(streamId, eventType, message, extra = {}) {
  try {
    await db.ffmpegLog.create({
      data: {
        streamId,
        eventType,
        message,
        ...extra,
      },
    });
  } catch (error) {
    console.error(`[worker] Failed to write log for ${streamId}:`, error);
  }
}

async function markStreamFailed(streamId, message) {
  await db.stream.update({
    where: { id: streamId },
    data: {
      status: "FAILED",
      failureReason: message,
      actualEndAt: new Date(),
    },
  });
  await logEvent(streamId, "ERROR", message);
}

async function claimDueScheduledStreams() {
  const dueStreams = await db.stream.findMany({
    where: {
      status: "SCHEDULED",
      scheduledStartAt: { lte: new Date() },
    },
    select: { id: true },
    orderBy: { scheduledStartAt: "asc" },
  });

  for (const stream of dueStreams) {
    await db.stream.updateMany({
      where: {
        id: stream.id,
        status: "SCHEDULED",
      },
      data: {
        status: "STARTING",
        actualStartAt: new Date(),
        failureReason: null,
        ffmpegCommand: null,
      },
    });
  }
}

async function releaseStaleClaims() {
  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS);
  const staleClaims = await db.stream.findMany({
    where: {
      status: "STARTING",
      updatedAt: { lt: staleBefore },
      NOT: {
        ffmpegCommand: null,
      },
    },
    select: {
      id: true,
      ffmpegCommand: true,
    },
  });

  for (const stream of staleClaims) {
    if (!isClaimToken(stream.ffmpegCommand)) {
      continue;
    }

    await db.stream.update({
      where: { id: stream.id },
      data: {
        ffmpegCommand: null,
        failureReason: "Recovered stale worker claim.",
      },
    });
  }
}

async function queueStaleLiveRecoveries() {
  const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
  const staleStreams = await db.stream.findMany({
    where: {
      status: "LIVE",
      OR: [
        { lastHeartbeatAt: null },
        { lastHeartbeatAt: { lt: staleBefore } },
      ],
    },
    select: { id: true },
  });

  for (const stream of staleStreams) {
    if (activeProcesses.has(stream.id)) {
      continue;
    }

    await db.stream.updateMany({
      where: {
        id: stream.id,
        status: "LIVE",
      },
      data: {
        status: "STARTING",
        ffmpegCommand: null,
        failureReason: "Worker heartbeat expired. Recovering stream.",
      },
    });
  }
}

async function stopProcessForStream(streamId, desiredStatus) {
  clearReconnect(streamId);
  clearHeartbeat(streamId);

  const processInstance = activeProcesses.get(streamId);
  if (processInstance) {
    processInstance.kill("SIGKILL");
    activeProcesses.delete(streamId);
  }

  cleanupPlaylistFile(streamId);

  if (desiredStatus === "COMPLETED" || desiredStatus === "CANCELLED") {
    await logEvent(streamId, "INFO", `Stream stopped with final status ${desiredStatus}.`);
  }
}

async function reconcileProcessState() {
  const activeIds = Array.from(activeProcesses.keys());
  for (const streamId of activeIds) {
    const stream = await db.stream.findUnique({
      where: { id: streamId },
      select: { status: true },
    });

    if (!stream || (stream.status !== "LIVE" && stream.status !== "STARTING")) {
      await stopProcessForStream(streamId, stream?.status || "COMPLETED");
    }
  }
}

async function claimStartingStreams() {
  const candidates = await db.stream.findMany({
    where: {
      status: "STARTING",
      ffmpegCommand: null,
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
  });

  const claimed = [];
  for (const candidate of candidates) {
    if (activeProcesses.has(candidate.id)) {
      continue;
    }

    const claimToken = createClaimToken();
    const result = await db.stream.updateMany({
      where: {
        id: candidate.id,
        status: "STARTING",
        ffmpegCommand: null,
      },
      data: {
        ffmpegCommand: claimToken,
      },
    });

    if (result.count === 1) {
      claimed.push({ id: candidate.id, claimToken });
    }
  }

  return claimed;
}

function startHeartbeat(streamId) {
  clearHeartbeat(streamId);

  const interval = setInterval(async () => {
    try {
      await db.stream.update({
        where: { id: streamId },
        data: {
          lastHeartbeatAt: new Date(),
        },
      });
    } catch (_) {}
  }, 10000);

  heartbeatIntervals.set(streamId, interval);
}

async function startMockStream(streamId) {
  const processInstance = spawn("sleep", ["3600"]);
  activeProcesses.set(streamId, processInstance);

  await db.stream.update({
    where: { id: streamId },
    data: {
      status: "LIVE",
      ffmpegCommand: "mock-stream-engine-active",
      lastHeartbeatAt: new Date(),
      failureReason: null,
    },
  });

  await logEvent(streamId, "INFO", "Mock Stream Engine initiated successfully.");
  startHeartbeat(streamId);

  let uptimeSeconds = 0;
  const statsInterval = setInterval(async () => {
    if (!activeProcesses.has(streamId)) {
      clearInterval(statsInterval);
      return;
    }

    uptimeSeconds += 10;
    await logEvent(streamId, "STATS", "Mocking - FPS: 30, Bitrate: 3000 kbps", {
      bitrateKbps: 3000,
      uptimeSeconds,
    });
  }, 10000);

  heartbeatIntervals.set(`${streamId}:stats`, statsInterval);

  processInstance.on("close", async () => {
    clearInterval(statsInterval);
    heartbeatIntervals.delete(`${streamId}:stats`);
    await handleProcessClose(streamId, null, "Mock stream process exited.");
  });
}

async function handleProcessClose(streamId, code, fallbackMessage) {
  clearHeartbeat(streamId);
  activeProcesses.delete(streamId);
  cleanupPlaylistFile(streamId);

  const stream = await db.stream.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      title: true,
      status: true,
      autoRecoveryEnabled: true,
    },
  });

  if (!stream) {
    return;
  }

  if (stream.status === "COMPLETED" || stream.status === "CANCELLED") {
    await logEvent(streamId, "INFO", `Worker observed graceful shutdown for ${stream.status}.`);
    return;
  }

  const message = fallbackMessage || `FFmpeg process exited unexpectedly with code ${code}`;
  await logEvent(streamId, "ERROR", message);

  if (stream.autoRecoveryEnabled) {
    await db.stream.update({
      where: { id: streamId },
      data: {
        status: "STARTING",
        ffmpegCommand: null,
        failureReason: "Stream crashed. Recovering...",
      },
    });

    const timeout = setTimeout(() => {
      reconnectTimeouts.delete(streamId);
      runWorkerCycle().catch((error) => {
        console.error("[worker] Recovery cycle failed:", error);
      });
    }, 10000);
    reconnectTimeouts.set(streamId, timeout);
  } else {
    await markStreamFailed(streamId, message);
  }
}

async function startRealStream(streamId, claimToken) {
  const stream = await db.stream.findUnique({
    where: { id: streamId },
    include: {
      channel: true,
      playlist: {
        include: {
          items: {
            include: { media: true },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  if (!stream) {
    return;
  }

  const latest = await db.stream.findUnique({
    where: { id: streamId },
    select: { ffmpegCommand: true, status: true },
  });

  if (!latest || latest.status !== "STARTING" || latest.ffmpegCommand !== claimToken) {
    return;
  }

  const streamKey = stream.streamKeyOverride || stream.channel.defaultStreamKey;
  if (!streamKey && process.env.STREAM_EXECUTION_MODE !== "mock") {
    await markStreamFailed(streamId, "No stream key found for the channel or stream.");
    return;
  }

  const mediaFiles = (stream.playlist?.items || [])
    .map((item) => item.media && item.media.storagePath)
    .filter(Boolean);

  if (mediaFiles.length === 0) {
    await markStreamFailed(streamId, "No media items found in the stream playlist.");
    return;
  }

  const playlistPath = getPlaylistPath(streamId);
  const playlistContents = mediaFiles
    .map((filePath) => `file '${path.resolve(filePath).replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(playlistPath, playlistContents);

  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const isLoop = stream.playlist && stream.playlist.type === "LOOP";
  const rtmpBase = process.env.STREAM_RTMP_BASE_URL || "rtmp://a.rtmp.youtube.com/live2";
  const rtmpUrl = `${rtmpBase}/${streamKey}`;

  const args = ["-re"];
  if (isLoop) {
    args.push("-stream_loop", "-1");
  }
  args.push(
    "-f", "concat",
    "-safe", "0",
    "-i", playlistPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-b:v", "3000k",
    "-maxrate", "3000k",
    "-bufsize", "6000k",
    "-pix_fmt", "yuv420p",
    "-g", "60",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    "-f", "flv",
    rtmpUrl,
  );

  const commandString = `${ffmpegPath} ${args.join(" ")}`;
  console.log(`[worker] Starting stream ${stream.title} (${streamId})`);
  console.log(`[worker] ${commandString}`);

  const processInstance = spawn(ffmpegPath, args);
  activeProcesses.set(streamId, processInstance);

  await db.stream.update({
    where: { id: streamId },
    data: {
      status: "LIVE",
      ffmpegCommand: commandString,
      lastHeartbeatAt: new Date(),
      failureReason: null,
    },
  });

  await logEvent(streamId, "INFO", "FFmpeg worker started stream successfully.", {
    command: commandString,
  });

  startHeartbeat(streamId);

  processInstance.stderr.on("data", (data) => {
    const chunk = data.toString();
    const match = chunk.match(/frame=\s*(\d+)\s+fps=\s*([\d.]+).*bitrate=\s*([\d.]+)\s*kb\/s.*speed=\s*([\d.]+)x/);

    if (!match) {
      return;
    }

    const frameCount = parseInt(match[1], 10);
    const fps = parseFloat(match[2]);
    const bitrate = Math.round(parseFloat(match[3]));

    if (frameCount % 150 === 0) {
      logEvent(streamId, "STATS", `Streaming - FPS: ${fps}, Bitrate: ${bitrate} kbps`, {
        bitrateKbps: bitrate,
        uptimeSeconds: Math.round(frameCount / 30),
      }).catch(() => {});
    }
  });

  processInstance.on("close", async (code) => {
    await handleProcessClose(streamId, code, null);
  });
}

async function startClaimedStream(streamId, claimToken) {
  try {
    if (process.env.STREAM_EXECUTION_MODE === "mock") {
      await startMockStream(streamId);
      return;
    }

    await startRealStream(streamId, claimToken);
  } catch (error) {
    console.error(`[worker] Failed to start stream ${streamId}:`, error);
    activeProcesses.delete(streamId);
    clearHeartbeat(streamId);
    cleanupPlaylistFile(streamId);
    await markStreamFailed(streamId, error.message || "Failed to start FFmpeg worker.");
  }
}

async function runWorkerCycle() {
  await releaseStaleClaims();
  await queueStaleLiveRecoveries();
  await claimDueScheduledStreams();
  await reconcileProcessState();

  const claimed = await claimStartingStreams();
  for (const stream of claimed) {
    await startClaimedStream(stream.id, stream.claimToken);
  }
}

async function main() {
  console.log(`[worker] Stream worker started as ${WORKER_ID}`);
  console.log(`[worker] Poll interval: ${POLL_MS}ms`);

  await runWorkerCycle();
  setInterval(() => {
    runWorkerCycle().catch((error) => {
      console.error("[worker] Poll cycle failed:", error);
    });
  }, POLL_MS);
}

main().catch((error) => {
  console.error("[worker] Fatal startup failure:", error);
  process.exitCode = 1;
});

process.on("SIGINT", async () => {
  console.log("[worker] Shutting down...");
  for (const streamId of Array.from(activeProcesses.keys())) {
    await stopProcessForStream(streamId, "COMPLETED");
  }
  await db.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  for (const streamId of Array.from(activeProcesses.keys())) {
    await stopProcessForStream(streamId, "COMPLETED");
  }
  await db.$disconnect();
  process.exit(0);
});
