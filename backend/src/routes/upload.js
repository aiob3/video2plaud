import express from "express";
import fs from "fs";
import { probeVideo } from "../../lib/media.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { config } from "../../config/index.js";

const router = express.Router();

router.post("/", uploadMiddleware.single("file"), async (req, res) => {
  const startTime = Date.now();
  let filePath = null;

  try {
    filePath = req.file?.path;

    if (!filePath) {
      const errorDetail = {
        error: "file required",
        message: "Nenhum arquivo foi enviado",
        timestamp: new Date().toISOString(),
        details: "Certifique-se de selecionar um arquivo .mp4, .mov ou .mkv"
      };
      console.error("[UPLOAD_ERROR]", JSON.stringify(errorDetail));
      res.status(400).json(errorDetail);
      return;
    }

    console.log(`[UPLOAD_START] File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    const meta = await probeVideo(filePath);
    console.log(`[PROBE_SUCCESS] Codec: ${meta.codec}, Resolution: ${meta.width}x${meta.height}, Duration: ${meta.duration}s`);

    if (meta.codec !== "h264") {
      const errorDetail = {
        error: "codec must be h264",
        message: `Codec inválido: ${meta.codec}`,
        timestamp: new Date().toISOString(),
        details: `O vídeo deve usar codec H.264. Codec detectado: ${meta.codec}`,
        file: req.file.originalname
      };
      console.error("[VALIDATION_ERROR]", JSON.stringify(errorDetail));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(400).json(errorDetail);
      return;
    }

    if (
      meta.width < config.minResolution.width ||
      meta.height < config.minResolution.height
    ) {
      const errorDetail = {
        error: "resolution too low",
        message: `Resolução muito baixa: ${meta.width}x${meta.height}`,
        timestamp: new Date().toISOString(),
        details: `Resolução mínima: ${config.minResolution.width}x${config.minResolution.height}`,
        file: req.file.originalname
      };
      console.error("[VALIDATION_ERROR]", JSON.stringify(errorDetail));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(400).json(errorDetail);
      return;
    }

    if (meta.duration > config.maxDurationSeconds) {
      const errorDetail = {
        error: "duration too long",
        message: `Duração muito longa: ${Math.round(meta.duration / 60)} minutos`,
        timestamp: new Date().toISOString(),
        details: `Duração máxima: ${config.maxDurationSeconds / 60} minutos`,
        file: req.file.originalname
      };
      console.error("[VALIDATION_ERROR]", JSON.stringify(errorDetail));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(400).json(errorDetail);
      return;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[UPLOAD_SUCCESS] File: ${req.file.originalname}, Time: ${elapsed}ms`);

    res.status(200).json({
      path: filePath,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      codec: meta.codec,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    const errorDetail = {
      error: "processing failed",
      message: err.message,
      timestamp: new Date().toISOString(),
      details: err.stack,
      file: req.file?.originalname || "unknown"
    };
    console.error("[UPLOAD_EXCEPTION]", JSON.stringify(errorDetail));

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json(errorDetail);
  }
});

export const uploadRouter = router;
