import { exec } from "child_process";
import path from "path";

interface MediaMetadata {
  durationSeconds?: number;
  width?: number;
  height?: number;
}

/**
 * Execute ffprobe to extract duration and resolution metadata from videos/audio
 */
export function extractMediaMetadata(filePath: string): Promise<MediaMetadata> {
  return new Promise((resolve) => {
    const absPath = path.resolve(filePath);
    
    // Command to fetch duration and width/height in one go in JSON format
    const ffprobeCmd = `ffprobe -v error -show_entries format=duration -show_entries stream=width,height -of json "${absPath}"`;

    exec(ffprobeCmd, (err, stdout) => {
      if (err || !stdout) {
        console.error("ffprobe failed:", err);
        resolve({});
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const durationSeconds = data.format?.duration ? Math.round(parseFloat(data.format.duration)) : undefined;
        
        // Find video stream
        const videoStream = data.streams?.find((s: any) => s.width && s.height);
        const width = videoStream?.width;
        const height = videoStream?.height;

        resolve({
          durationSeconds,
          width,
          height,
        });
      } catch (parseErr) {
        console.error("Failed to parse ffprobe json output:", parseErr);
        resolve({});
      }
    });
  });
}
