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
    // ID Mestre 06022-191500 - reportar progresso granular para a fila
    const reportProgress = async (payload) => job.progress(payload);
    await reportProgress({ percent: 1, stage: "queued", detail: "Job enfileirado" });
    return convertToAudio({ inputPath, outputName, title, reportProgress });
  });
};
