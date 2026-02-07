// ID Mestre 06022-191500 - worker.js: processamento da fila com progresso real
import { convertQueue } from "../lib/queue.js";
import { convertToAudio } from "../services/convert.js";

let started = false;

export const startWorker = () => {
  if (started) {
    return;
  }
  started = true;
  convertQueue.process(async (job) => {
    const { inputPath, title, durationSec } = job.data;
    const outputName = job.id.toString();
    const reportProgress = async (payload) => job.progress(payload);
    await reportProgress({
      percent: 1,
      stage: "queued",
      detail: "Job recebido pelo worker",
    });
    return convertToAudio({
      inputPath,
      outputName,
      title,
      durationSec: durationSec || 0,
      reportProgress,
    });
  });
};
