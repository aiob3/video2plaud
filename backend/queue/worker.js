import { convertQueue } from "../lib/queue.js";
import { convertToAudio } from "../services/convert.js";

let started = false;

export const startWorker = () => {
  if (started) {
    return;
  }
  started = true;
  convertQueue.process(async (job) => {
    const { inputPath, title } = job.data;
    const outputName = job.id.toString();
    return convertToAudio({ inputPath, outputName, title });
  });
};
