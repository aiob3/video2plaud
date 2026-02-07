import multer from "multer";
import { nanoid } from "nanoid";
import { config } from "../../config/index.js";

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.uploadDir),
  filename: (_, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${nanoid()}.${ext}`);
  },
});

const limits = { fileSize: 2 * 1024 * 1024 * 1024 };

const fileFilter = (_, file, cb) => {
  const allowed = ["mp4", "mov", "mkv"];
  const ext = file.originalname.split(".").pop()?.toLowerCase();
  if (!ext || !allowed.includes(ext)) {
    cb(new Error("invalid file type"));
    return;
  }
  cb(null, true);
};

export const uploadMiddleware = multer({ storage, limits, fileFilter });
