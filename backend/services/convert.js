// ID Mestre 06022-191500 - convert.js: conversão vídeo→áudio with externalized ffmpeg progress logic
import { execFile } from "child_process";
import { join } from "path";
import { config } from "../config/index.js";
import { runWithRealProgress } from "./ffmpegProgress.js";

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

export const convertToAudio = async ({
  inputPath,
  outputName,
  title,
  durationSec = 0,
  reportProgress = () => {},
}) => {
  // ID Mestre 06022-191500 - reportar progresso estruturado para Bull/UI
  const safeProgress = async (payload) => {
    try {
      await reportProgress(payload);
    } catch (_) {}
  };

  const baseDir = config.uploadDir;
  const outputPath = join(baseDir, `${outputName}.mp4`);
  const thumbPath = join(baseDir, `${outputName}.jpg`);

  // ── Etapa 1: Validação ──────────────────────────────────────────
  await safeProgress({
    percent: 2,
    stage: "validating",
    detail: "Validando arquivo de entrada",
  });

  // ── Etapa 2: Thumbnail ──────────────────────────────────────────
  await safeProgress({
    percent: 5,
    stage: "thumbnail",
    detail: "Capturando thumbnail aos 15s",
  });

  await run([
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

  await safeProgress({
    percent: 10,
    stage: "thumbnail-done",
    detail: "📸 Thumbnail gerada com sucesso",
  });

  // ── Etapa 3: Conversão de áudio (progresso real 10–95%) ─────────
  await safeProgress({
    percent: 11,
    stage: "convert-audio",
    detail: "Iniciando extração de áudio AAC 128k / 44.1kHz",
  });

  await runWithRealProgress(
    [
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
      durationSec,
      rangeStart: 11,
      rangeEnd: 95,
      stage: "convert-audio",
      detail: "🎧 Extraindo áudio AAC",
      reportProgress: safeProgress,
    },
  );

  // ── Etapa 4: Finalização ────────────────────────────────────────
  await safeProgress({
    percent: 96,
    stage: "faststart",
    detail: "Movendo atom moov para início do arquivo (faststart)",
  });
  await safeProgress({
    percent: 98,
    stage: "metadata",
    detail: `Gravando metadados: "${title || "(sem título)"}"`,
  });
  await safeProgress({
    percent: 100,
    stage: "done",
    detail: "✅ Conversão concluída com sucesso",
  });

  return { outputPath, thumbPath, outputName };
};
