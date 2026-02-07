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

export const convertToAudio = async ({ inputPath, outputName, title }) => {
  const baseDir = config.uploadDir;
  const outputPath = join(baseDir, `${outputName}.mp4`);
  const thumbPath = join(baseDir, `${outputName}.jpg`);
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
  return { outputPath, thumbPath, outputName };
};
