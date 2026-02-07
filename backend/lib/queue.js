import Queue from "bull";
import { config } from "../config/index.js";

export const convertQueue = new Queue("convert", config.redisUrl);

export const enqueueConvert = async (payload) => convertQueue.add(payload);

export const getJob = async (id) => convertQueue.getJob(id);
