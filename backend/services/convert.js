import { execFile } from "child_process";
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

export const convertToAudio = async ({
  inputPath,
  outputName,
  title,
  reportProgress = () => {},
}) => {
  // ID Mestre 06022-191500 - reportar progresso para Bull e UI
  const safeProgress = (value) => {
    try {
      reportProgress(value);
    } catch (_) {
      // ignora falha de progresso para não interromper conversão
    }
  };

  const baseDir = config.uploadDir;
  const outputPath = join(baseDir, `${outputName}.mp4`);
  const thumbPath = join(baseDir, `${outputName}.jpg`);

  safeProgress(5);
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

  safeProgress(50);
  await run([
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
  ]);

  safeProgress(95);
  safeProgress(100);

  return { outputPath, thumbPath, outputName };
};
