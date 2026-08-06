import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;
const PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL; // optional CDN/custom domain

export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = "uploads"
): Promise<string> {
  const ext = path.extname(originalName) || ".bin";
  const key = `${folder}/${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // PDFs open inline in the browser instead of forcing download
      ContentDisposition: contentType === "application/pdf" ? "inline" : undefined,
    })
  );

  const base = PUBLIC_URL ?? `https://${BUCKET}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com`;
  return `${base}/${key}`;
}
