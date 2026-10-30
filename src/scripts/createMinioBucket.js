
import "dotenv/config";
import minioClient from "../config/minio.js";

const bucket = process.env.MINIO_BUCKET;

if (!bucket) {
  throw new Error("MINIO_BUCKET is missing from .env");
}

try {
  const exists = await minioClient.bucketExists(bucket);

  if (exists) {
    console.log(`Bucket "${bucket}" already exists.`);
  } else {
    await minioClient.makeBucket(bucket);
    console.log(`Bucket "${bucket}" created successfully.`);
  }
} catch (error) {
  console.error("Bucket creation failed:", error.message);
  process.exitCode = 1;
}
