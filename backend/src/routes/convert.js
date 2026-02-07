import express from "express";
import { enqueueConvert, getJob } from "../../lib/queue.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const startTime = Date.now();
  try {
    const { path, title } = req.body || {};
    if (!path) {
      const errorDetail = {
        error: "path required",
        message: "Caminho do arquivo não fornecido",
        timestamp: new Date().toISOString(),
        details: "O campo 'path' é obrigatório para iniciar a conversão",
      };
      console.error("[CONVERT_ERROR]", JSON.stringify(errorDetail));
      res.status(400).json(errorDetail);
      return;
    }

    console.log(
      `[CONVERT_START] Path: ${path}, Title: ${title || "sem título"}`,
    );
    const job = await enqueueConvert({ inputPath: path, title: title || "" });
    const elapsed = Date.now() - startTime;

    console.log(`[CONVERT_ENQUEUED] JobId: ${job.id}, Time: ${elapsed}ms`);
    res.status(202).json({
      jobId: job.id,
      message: "Conversão iniciada com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorDetail = {
      error: "enqueue failed",
      message: err.message,
      timestamp: new Date().toISOString(),
      details: err.stack,
    };
    console.error("[CONVERT_EXCEPTION]", JSON.stringify(errorDetail));
    res.status(500).json(errorDetail);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await getJob(req.params.id);
    if (!job) {
      const errorDetail = {
        error: "not found",
        message: "Job de conversão não encontrado",
        timestamp: new Date().toISOString(),
        jobId: req.params.id,
      };
      console.error("[JOB_NOT_FOUND]", JSON.stringify(errorDetail));
      res.status(404).json(errorDetail);
      return;
    }

    const state = await job.getState();
    const rawProgress = job.progress() || 0;

    let progress = 0;
    let stage = undefined;
    let detail = undefined;

    if (typeof rawProgress === "number") {
      progress = rawProgress;
    } else if (typeof rawProgress === "object" && rawProgress !== null) {
      progress = Number(rawProgress.percent ?? rawProgress.progress ?? 0);
      stage = rawProgress.stage;
      detail = rawProgress.detail;
    }

    console.log(
      `[JOB_STATUS] JobId: ${req.params.id}, State: ${state}, Progress: ${progress}%, Stage: ${stage || "n/a"}, Detail: ${detail || ""}`,
    );

    if (state === "completed") {
      const result = await job.finished();
      console.log(
        `[JOB_COMPLETED] JobId: ${req.params.id}, Output: ${result.outputPath}`,
      );
      res.status(200).json({
        status: state,
        result,
        message: "Conversão concluída com sucesso",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (state === "failed") {
      const failedReason = job.failedReason;
      console.error(
        `[JOB_FAILED] JobId: ${req.params.id}, Reason: ${failedReason}`,
      );
      res.status(200).json({
        status: state,
        error: failedReason,
        message: "Conversão falhou",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: state,
      progress,
      stage,
      detail,
      message:
        state === "active" ? "Processando..." : "Aguardando processamento",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorDetail = {
      error: "status check failed",
      message: err.message,
      timestamp: new Date().toISOString(),
      details: err.stack,
      jobId: req.params.id,
    };
    console.error("[JOB_STATUS_EXCEPTION]", JSON.stringify(errorDetail));
    res.status(500).json(errorDetail);
  }
});

export const convertRouter = router;
