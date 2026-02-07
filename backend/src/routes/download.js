import express from "express";
import fs from "fs";
import path from "path";
import { getJob } from "../../lib/queue.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const job = await getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const state = await job.getState();
  if (state !== "completed") {
    res.status(409).json({ error: "not ready" });
    return;
  }
  const result = await job.finished();
  if (!result?.outputPath || !fs.existsSync(result.outputPath)) {
    res.status(500).json({ error: "file missing" });
    return;
  }
  res.download(result.outputPath, `${result.outputName}.mp4`);
});

export const downloadRouter = router;
