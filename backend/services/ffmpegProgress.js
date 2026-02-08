// ID Mestre 06022-191500 - ffmpegProgress.js: parsing and runWithRealProgress extracted for testability
import { spawn } from "child_process";

export const parseTimeFromStderr = (data) => {
  const match = data.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return null;
  return (
    parseInt(match[1], 10) * 3600 +
    parseInt(match[2], 10) * 60 +
    parseInt(match[3], 10) +
    parseInt(match[4], 10) / 100
  );
};

export const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const computePercent = (
  currentTimeSec,
  durationSec,
  rangeStart = 0,
  rangeEnd = 95,
) => {
  if (durationSec <= 0) return rangeStart;
  const ratio = Math.min(currentTimeSec / durationSec, 1);
  const percentRaw = rangeStart + ratio * (rangeEnd - rangeStart);
  const percent = Math.min(Math.floor(percentRaw), rangeEnd);
  return percent;
};

export const runWithRealProgress = (
  args,
  {
    durationSec = 0,
    rangeStart = 0,
    rangeEnd = 95,
    stage,
    detail,
    reportProgress,
    spawnFactory,
  } = {},
) =>
  new Promise((resolve, reject) => {
    let lastReportedPercent = rangeStart;

    const spawnFn = spawnFactory
      ? spawnFactory
      : (cmd, cmdArgs, spawnOpts) => spawn(cmd, cmdArgs, spawnOpts);

    const child = spawnFn(args[0], args.slice(1), {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const onData = async (chunk) => {
      if (!reportProgress || durationSec <= 0) return;
      const text = chunk.toString();
      const currentTime = parseTimeFromStderr(text);
      if (currentTime === null) return;

      const percent = computePercent(
        currentTime,
        durationSec,
        rangeStart,
        rangeEnd,
      );

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

    if (child.stderr && child.stderr.on) child.stderr.on("data", onData);
    if (child.stdout && child.stdout.on) child.stdout.on("data", onData);

    child.on("error", (err) => reject(err));

    child.on("exit", (code) => {
      if (reportProgress) {
        reportProgress({
          percent: rangeEnd,
          stage,
          detail: `${detail} — finalizado`,
        }).catch(() => {});
      }
      if (code === 0) resolve();
      else reject(new Error(`${args[0]} exited with code ${code}`));
    });
  });
