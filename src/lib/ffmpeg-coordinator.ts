import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { db } from "./db";

// Ensure playlist config directory exists
const STORAGE_DIR = path.join(process.cwd(), "storage");
const PLAYLISTS_DIR = path.join(STORAGE_DIR, "playlists");
const LOGS_DIR = path.join(STORAGE_DIR, "logs");

if (!fs.existsSync(PLAYLISTS_DIR)) fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

class FfmpegCoordinator {
  private activeProcesses = new Map<string, ChildProcess>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Start a scheduled or manual stream
   */
  async startStream(streamId: string): Promise<void> {
    if (this.activeProcesses.has(streamId)) {
      console.log(`Stream ${streamId} is already running.`);
      return;
    }

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
      throw new Error(`Stream not found: ${streamId}`);
    }

    const streamKey = stream.streamKeyOverride || stream.channel.defaultStreamKey;
    const rtmpUrl = `${process.env.STREAM_RTMP_BASE_URL || "rtmp://a.rtmp.youtube.com/live2"}/${streamKey}`;

    if (!streamKey && process.env.STREAM_EXECUTION_MODE !== "mock") {
      await db.stream.update({
        where: { id: streamId },
        data: { status: "FAILED", failureReason: "No stream key found for the channel or stream." },
      });
      return;
    }

    // Set starting status
    await db.stream.update({
      where: { id: streamId },
      data: { status: "STARTING", actualStartAt: new Date(), failureReason: null },
    });

    if (process.env.STREAM_EXECUTION_MODE === "mock") {
      this.runMockStream(streamId);
      return;
    }

    try {
      // Compile files to play
      let mediaFiles: string[] = [];
      if (stream.playlist) {
        mediaFiles = stream.playlist.items
          .map((item) => item.media?.storagePath)
          .filter((p): p is string => !!p);
      }

      if (mediaFiles.length === 0) {
        throw new Error("No media items found in the stream playlist.");
      }

      // Generate concat list text file for FFmpeg
      const playlistTxtPath = path.join(PLAYLISTS_DIR, `${streamId}.txt`);
      const fileContents = mediaFiles
        .map((filePath) => {
          // Resolve absolute path to escape spaces correctly
          const absPath = path.resolve(filePath);
          return `file '${absPath.replace(/'/g, "'\\''")}'`;
        })
        .join("\n");
      fs.writeFileSync(playlistTxtPath, fileContents);

      // FFmpeg command arguments
      // Loop: -stream_loop -1 loops the concat list indefinitely
      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      const isLoop = stream.playlist?.type === "LOOP";
      
      const args: string[] = [
        "-re", // Read input at native frame rate
      ];

      if (isLoop) {
        args.push("-stream_loop", "-1");
      }

      args.push(
        "-f", "concat",
        "-safe", "0",
        "-i", playlistTxtPath,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-tune", "zerolatency",
        "-b:v", "3000k",
        "-maxrate", "3000k",
        "-bufsize", "6000k",
        "-pix_fmt", "yuv420p",
        "-g", "60", // Keyframe interval (2 seconds for 30fps)
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "flv",
        rtmpUrl
      );

      console.log(`Spawning FFmpeg: ${ffmpegPath} ${args.join(" ")}`);
      
      const processInstance = spawn(ffmpegPath, args);
      this.activeProcesses.set(streamId, processInstance);

      await db.stream.update({
        where: { id: streamId },
        data: { status: "LIVE", ffmpegCommand: `${ffmpegPath} ${args.join(" ")}` },
      });

      // Handle logs and stats parsing from stderr (FFmpeg outputs logs on stderr)
      let logBuffer = "";
      processInstance.stderr.on("data", (data) => {
        const chunk = data.toString();
        logBuffer += chunk;

        // Parse stats periodically (e.g. frame=  123 fps= 30 q=28.0 size=    500kB time=00:00:04.10 bitrate=1000.0kbits/s speed=1.0x)
        const statsRegex = /frame=\s*(\d+)\s+fps=\s*([\d.]+).*bitrate=\s*([\d.]+)\s*kb\/s.*speed=\s*([\d.]+)x/;
        const match = chunk.match(statsRegex);

        if (match) {
          const frameCount = parseInt(match[1]);
          const fps = parseFloat(match[2]);
          const bitrate = Math.round(parseFloat(match[3]));
          
          // Log stats to DB (using thin sampling so we don't blow up DB size)
          if (frameCount % 150 === 0) {
            db.ffmpegLog.create({
              data: {
                streamId,
                eventType: "STATS",
                message: `Streaming - FPS: ${fps}, Bitrate: ${bitrate} kbps`,
                bitrateKbps: bitrate,
                uptimeSeconds: Math.round(frameCount / 30),
              },
            }).catch(() => {});

            db.stream.update({
              where: { id: streamId },
              data: { lastHeartbeatAt: new Date() },
            }).catch(() => {});
          }
        }

        // Keep buffer size limited
        if (logBuffer.length > 5000) {
          logBuffer = logBuffer.substring(logBuffer.length - 2000);
        }
      });

      processInstance.on("close", async (code) => {
        console.log(`FFmpeg stream ${streamId} closed with code ${code}`);
        this.activeProcesses.delete(streamId);

        // Fetch current stream state to check if user cancelled it
        const currentStream = await db.stream.findUnique({ where: { id: streamId } });
        
        if (currentStream && (currentStream.status === "LIVE" || currentStream.status === "STARTING")) {
          // Unexpected exit! Update DB
          await db.ffmpegLog.create({
            data: {
              streamId,
              eventType: "ERROR",
              message: `FFmpeg process exited unexpectedly with code ${code}`,
            },
          });

          if (currentStream.autoRecoveryEnabled) {
            await db.stream.update({
              where: { id: streamId },
              data: { status: "STARTING", failureReason: "Stream crashed. Recovering..." },
            });

            // Reconnect after 10 seconds
            const timeout = setTimeout(() => {
              this.startStream(streamId).catch(console.error);
            }, 10000);
            this.reconnectTimeouts.set(streamId, timeout);
          } else {
            await db.stream.update({
              where: { id: streamId },
              data: { status: "FAILED", failureReason: `FFmpeg process exited with code ${code}` },
            });
          }
        }
      });

    } catch (error: any) {
      console.error(`Error starting stream ${streamId}:`, error);
      await db.stream.update({
        where: { id: streamId },
        data: { status: "FAILED", failureReason: error.message || "Failed to start FFmpeg." },
      });
      await db.ffmpegLog.create({
        data: {
          streamId,
          eventType: "ERROR",
          message: `Startup failed: ${error.message}`,
        },
      });
    }
  }

  /**
   * Stop an active stream
   */
  async stopStream(streamId: string): Promise<void> {
    // Clear any pending recovery timeouts
    const timeout = this.reconnectTimeouts.get(streamId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(streamId);
    }

    const processInstance = this.activeProcesses.get(streamId);
    if (processInstance) {
      processInstance.kill("SIGKILL");
      this.activeProcesses.delete(streamId);
    }

    await db.stream.update({
      where: { id: streamId },
      data: {
        status: "COMPLETED",
        actualEndAt: new Date(),
      },
    });

    await db.ffmpegLog.create({
      data: {
        streamId,
        eventType: "INFO",
        message: "Stream stopped manually by operator.",
      },
    });

    // Clean up temporary concat file
    try {
      const playlistTxtPath = path.join(PLAYLISTS_DIR, `${streamId}.txt`);
      if (fs.existsSync(playlistTxtPath)) {
        fs.unlinkSync(playlistTxtPath);
      }
    } catch (_) {}
  }

  /**
   * Auto-recovery scanner
   * Scans database for status=LIVE or status=STARTING, check if process is running in-memory, recovers if missing.
   */
  async recoverActiveStreams(): Promise<void> {
    const liveStreams = await db.stream.findMany({
      where: {
        status: { in: ["LIVE", "STARTING"] },
      },
    });

    for (const stream of liveStreams) {
      if (!this.activeProcesses.has(stream.id)) {
        console.log(`Auto-recovery: Recovering stream ${stream.title} (${stream.id})`);
        this.startStream(stream.id).catch(console.error);
      }
    }
  }

  /**
   * Run a mock stream that sleeps/loops to simulate a real broadcast in dev environment
   */
  private runMockStream(streamId: string): void {
    // Spawn a dummy sleep process
    const mockProcess = spawn("sleep", ["3600"]);
    this.activeProcesses.set(streamId, mockProcess);

    db.stream.update({
      where: { id: streamId },
      data: { status: "LIVE", ffmpegCommand: "mock-stream-engine-active" },
    }).then(async () => {
      await db.ffmpegLog.create({
        data: {
          streamId,
          eventType: "INFO",
          message: "Mock Stream Engine initiated successfully (Dev Mode).",
        },
      });

      // Periodically update heartbeat and create dummy stats logs
      let counter = 0;
      const interval = setInterval(async () => {
        if (!this.activeProcesses.has(streamId)) {
          clearInterval(interval);
          return;
        }

        counter += 10;
        await db.stream.update({
          where: { id: streamId },
          data: { lastHeartbeatAt: new Date() },
        }).catch(() => {});

        await db.ffmpegLog.create({
          data: {
            streamId,
            eventType: "STATS",
            message: `Mocking - FPS: 30, Bitrate: ${2800 + Math.round(Math.random() * 400)} kbps`,
            bitrateKbps: 3000,
            uptimeSeconds: counter,
          },
        }).catch(() => {});
      }, 10000);

      mockProcess.on("close", async (code) => {
        clearInterval(interval);
        this.activeProcesses.delete(streamId);
        
        const currentStream = await db.stream.findUnique({ where: { id: streamId } });
        if (currentStream && (currentStream.status === "LIVE" || currentStream.status === "STARTING")) {
          await db.stream.update({
            where: { id: streamId },
            data: { status: "FAILED", failureReason: "Mock stream process exited." },
          });
        }
      });
    });
  }
}

// Export singleton coordinator
export const ffmpegCoordinator = new FfmpegCoordinator();
