
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null }
);

connection.on("error", (error) => {
  console.error("BullMQ Redis connection error:", error.message);
});

export const emailQueue = new Queue("email-jobs", {
  connection,
});

export { connection };
