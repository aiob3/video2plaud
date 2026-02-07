import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";
import { uploadRouter } from "./routes/upload.js";
import { convertRouter } from "./routes/convert.js";
import { healthRouter } from "./routes/health.js";
import { downloadRouter } from "./routes/download.js";
import { startWorker } from "../queue/worker.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const app = express();
app.use(express.json());
app.use(express.static(root));
app.use("/api/health", healthRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/convert", convertRouter);
app.use("/api/download", downloadRouter);

startWorker();

app.listen(config.port, () => {
  process.stdout.write(`listening on ${config.port}\n`);
});
