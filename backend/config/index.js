import dotenv from "dotenv";

dotenv.config();

const required = ["PORT", "REDIS_URL", "UPLOAD_DIR"];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing env: ${key}`);
  }
});

export const config = {
  port: Number(process.env.PORT),
  redisUrl: process.env.REDIS_URL,
  uploadDir: process.env.UPLOAD_DIR,
  maxDurationSeconds: 7200,
  minResolution: { width: 1280, height: 720 },
};
