import { run } from "./exec.js";
import { config } from "../config/index.js";

export const probeVideo = async (filePath) => {
  const stdout = await run([
    // ID Mestre 06022-191500 - uso de binário configurável do ffprobe
    config.ffprobeBin,
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-select_streams",
    "v:0",
    filePath,
  ]);
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0];
  return {
    codec: stream?.codec_name,
    width: stream?.width,
    height: stream?.height,
    duration: Number(stream?.duration),
  };
};
