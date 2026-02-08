import { describe, it, expect } from "vitest";
import { Readable } from "stream";
import {
  parseTimeFromStderr,
  computePercent,
  runWithRealProgress,
} from "../../services/ffmpegProgress.js";

describe("ffmpegProgress utils", () => {
  it("parseTimeFromStderr - parses time correctly and returns null when absent", () => {
    expect(
      parseTimeFromStderr("size=123 time=00:01:23.45 bitrate=100k"),
    ).toBeCloseTo(83.45);
    expect(parseTimeFromStderr("no time here")).toBeNull();
  });

  it("computePercent - computes correct percent mapping and bounds", () => {
    expect(computePercent(10, 100, 11, 95)).toBe(19);
    expect(computePercent(200, 100, 11, 95)).toBe(95);
    expect(computePercent(0, 0, 11, 95)).toBe(11);
  });

  it("runWithRealProgress - reports increments and final payload (mocked child)", async () => {
    const events = [
      "some log time=00:00:01.00",
      "time=00:00:02.00",
      "time=00:00:04.00",
    ];

    // Create fake child process where stderr emits data then exit(0)
    const stderr = new Readable({ read() {} });
    const stdout = new Readable({ read() {} });

    const child = {
      stderr,
      stdout,
      on(event, handler) {
        if (event === "exit") {
          setTimeout(() => {
            stderr.emit("data", Buffer.from(events[0]));
            stderr.emit("data", Buffer.from(events[1]));
            stderr.emit("data", Buffer.from(events[2]));
            handler(0);
          }, 10);
        }
      },
    };

    const spawnFactory = () => child;

    const reports = [];
    const reportProgress = async (p) => {
      reports.push(p);
    };

    await runWithRealProgress(["/bin/ffmpeg"], {
      durationSec: 4,
      rangeStart: 11,
      rangeEnd: 95,
      stage: "convert-audio",
      detail: "test",
      reportProgress,
      spawnFactory,
    });

    expect(reports.length).toBeGreaterThanOrEqual(2);
    const last = reports[reports.length - 1];
    expect(last.percent).toBe(95);
    expect(last.stage).toBe("convert-audio");
    expect(typeof last.detail).toBe("string");
    expect(last.detail.length).toBeGreaterThan(0);
  });
});
