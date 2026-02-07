import { execFile, spawn } from "child_process";
import { join } from "path";
import { config } from "../config/index.js";

const run = (args) =>
  new Promise((resolve, reject) => {
    execFile(args[0], args.slice(1), (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

// ID Mestre 06022-191500 - execução com heartbeat de progresso para processos mais longos (ex.: ffmpeg áudio)
const runWithHeartbeat = (
  args,
  { start = 0, end = 90, intervalMs = 2000, reportProgress },
) =>
  new Promise((resolve, reject) => {
    let current = start;
    let interval = null;

    const tick = async () => {
      if (!reportProgress) return;
      // incrementa de forma suave até end-1 para não conflitar com conclusão
      const step = Math.max(1, Math.floor((end - start) / 5));
      current = Math.min(end - 1, current + step);
      try {
        await reportProgress(current);
      } catch (_) {
        // não interrompe em caso de falha de progress
      }
    };

    if (reportProgress) {
      interval = setInterval(tick, intervalMs);
    }

    const child = spawn(args[0], args.slice(1), {
      stdio: ["ignore", "ignore", "inherit"],
    });

    child.on("error", (err) => {
      if (interval) clearInterval(interval);
      reject(err);
    });

    child.on("exit", (code) => {
      if (interval) clearInterval(interval);
      if (reportProgress) {
        reportProgress(end).catch(() => {});
      }
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${args[0]} exited with code ${code}`));
      }
    });
  });

export const convertToAudio = async ({
  inputPath,
  outputName,
  title,
  reportProgress = () => {},
}) => {
  // ID Mestre 06022-191500 - reportar progresso para Bull e UI
  const safeProgress = async (value) => {
    try {
      await reportProgress(value);
    } catch (_) {
      // ignora falha de progresso para não interromper conversão
    }
  };

  const baseDir = config.uploadDir;
  const outputPath = join(baseDir, `${outputName}.mp4`);
  const thumbPath = join(baseDir, `${outputName}.jpg`);

  await safeProgress(5);
  await run([
    // ID Mestre 06022-191500 - uso de binário configurável do ffmpeg
    config.ffmpegBin,
    "-y",
    "-ss",
    "15",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    thumbPath,
  ]);

  await safeProgress(50);
  await runWithHeartbeat(
    [
      // ID Mestre 06022-191500 - uso de binário configurável do ffmpeg
      config.ffmpegBin,
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-movflags",
      "+faststart",
      "-metadata",
      `title=${title || ""}`,
      outputPath,
    ],
    { start: 50, end: 95, intervalMs: 2000, reportProgress: safeProgress },
  );

  await safeProgress(100);

  return { outputPath, thumbPath, outputName };
};
