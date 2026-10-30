import "dotenv/config";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { connection } from "../queues/emailQueue.js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const worker = new Worker(
  "email-jobs",
  async (job) => {
    if (job.name !== "welcome-email") {
      throw new Error(`Unknown job type: ${job.name}`);
    }
    const { name, email } = job.data;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Welcome to our blog!",
      text: `Hi ${name}, welcome to our blog! Your account is ready.`,
      html: `<h1>Welcome, ${name}!</h1><p>Your account is ready.</p>`,
    });

    console.log(`Welcome email sent to ${email}`);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
    maxStalledCount: 1,
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("Email worker started");
worker.on("ready", () => {
  console.log("Worker is ready to process jobs");
});

worker.on("active", (job) => {
  console.log(`Processing job ${job.id}: ${job.name}`);
});

worker.on("error", (error) => {
  console.error("Worker error:", error.message);
});
