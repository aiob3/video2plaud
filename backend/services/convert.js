// ID Mestre 06022-191500 - convert.js: conversão vídeo→áudio com progresso real via parsing stderr ffmpeg
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

// ID Mestre 06022-191500 - parsear time= do stderr do ffmpeg para calcular % real
const parseTimeFromStderr = (data) => {
  const match = data.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return null;
  return (
    parseInt(match[1], 10) * 3600 +
    parseInt(match[2], 10) * 60 +
    parseInt(match[3], 10) +
    parseInt(match[4], 10) / 100
  );
};

// ID Mestre 06022-191500 - execução ffmpeg com progresso real baseado em duração do vídeo
const runWithRealProgress = (
  args,
  {
    durationSec = 0,
    rangeStart = 0,
    rangeEnd = 95,
    stage,
    detail,
    reportProgress,
  },
) =>
  new Promise((resolve, reject) => {
    let lastReportedPercent = rangeStart;

    const child = spawn(args[0], args.slice(1), {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const onData = async (chunk) => {
      if (!reportProgress || durationSec <= 0) return;
      const text = chunk.toString();
      const currentTime = parseTimeFromStderr(text);
      if (currentTime === null) return;

      const ratio = Math.min(currentTime / durationSec, 1);
      const percentRaw = rangeStart + ratio * (rangeEnd - rangeStart);
      const percent = Math.min(Math.floor(percentRaw), rangeEnd);

      if (percent > lastReportedPercent) {
        lastReportedPercent = percent;
        const elapsed = formatTime(currentTime);
        const total = formatTime(durationSec);
        try {
          await reportProgress({
            percent,
            stage,
            detail: `${detail} — ${elapsed} / ${total}`,
          });
        } catch (_) {}
      }
    };

    child.stderr.on("data", onData);
    child.stdout.on("data", onData);

    child.on("error", (err) => reject(err));

    child.on("exit", (code) => {
      if (reportProgress) {
        reportProgress({
          percent: rangeEnd,
          stage,
          detail: `${detail} — finalizado`,
        }).catch(() => {});
      }
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${args[0]} exited with code ${code}`));
      }
    });
  });

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

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
