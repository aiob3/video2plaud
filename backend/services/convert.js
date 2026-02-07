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
  {
    start = 0,
    end = 90,
    intervalMs = 2000,
    stage = "convert-audio",
    detail = "Convertendo áudio para AAC",
    reportProgress,
  },
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
        await reportProgress({ percent: current, stage, detail });
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
        reportProgress({ percent: end, stage, detail: "Finalizando contêiner MP4" }).catch(() => {});
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
  // ID Mestre 06022-191500 - reportar progresso para Bull e UI com estágios descritivos
  const safeProgress = async (percent, stage, detail) => {
    try {
      await reportProgress({ percent, stage, detail });
    } catch (_) {
      // ignora falha de progresso para não interromper conversão
    }
  };

  const baseDir = config.uploadDir;
  const outputPath = join(baseDir, `${outputName}.mp4`);
  const thumbPath = join(baseDir, `${outputName}.jpg`);

  await safeProgress(5, "prepare-thumb", "Preparando captura de thumbnail");
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

  await safeProgress(50, "thumb-ready", "Thumbnail capturada aos 15s");
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
    {
      start: 50,
      end: 95,
      intervalMs: 2000,
      stage: "convert-audio",
      detail: "Convertendo áudio para AAC 128k/44.1k com faststart",
      reportProgress: safeProgress,
    },
  );

  await safeProgress(100, "done", "Conversão concluída");

  return { outputPath, thumbPath, outputName };
};
