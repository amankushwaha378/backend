
import "dotenv/config";
import minioClient from "../config/minio.js";

const bucket = process.env.MINIO_BUCKET;

try {
  const exists = await minioClient.bucketExists(bucket);

  console.log("MinIO connection successful.");
  console.log("Bucket:", bucket);
  console.log("Bucket exists:", exists);

  if (!exists) {
    console.log(
      "Invalid",
    );
  }
} catch (error) {
  console.error("MinIO check failed:", error.message);
  process.exitCode = 1;
}
