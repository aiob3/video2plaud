import { run } from "./exec.js";

export const probeVideo = async (filePath) => {
  const stdout = await run([
    "ffprobe",
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
