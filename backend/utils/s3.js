const crypto = require("crypto");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

let s3Client = null;

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getS3Client = () => {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: getRequiredEnv("AWS_REGION"),
    credentials: {
      accessKeyId: getRequiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });

  return s3Client;
};

const getBucketName = () => getRequiredEnv("AWS_S3_BUCKET_NAME");

const sanitizeFileName = (name = "file") =>
  String(name).replace(/[^a-zA-Z0-9._-]/g, "_");

const buildUniqueKey = (folder, originalName) => {
  const ext = path.extname(originalName || "");
  const base = sanitizeFileName(path.basename(originalName || "file", ext));
  const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  return `${folder}/${unique}-${base}${ext}`;
};

/**
 * Upload a document buffer to private S3.
 * Use for invoices, company docs, ticket attachments — NOT order Excel files.
 */
const uploadDocumentToS3 = async ({
  buffer,
  originalName,
  folder,
  contentType = "application/octet-stream",
}) => {
  if (!buffer?.length) {
    throw new Error("File buffer is empty");
  }

  const bucket = getBucketName();
  const key = buildUniqueKey(folder, originalName);
  const client = getS3Client();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (error) {
    console.error("S3 upload failed:", error);
    throw new Error(
      error.message || "Failed to upload document to storage"
    );
  }

  return {
    s3Key: key,
    s3Bucket: bucket,
    fileName: originalName || "",
  };
};

const getPresignedDownloadUrl = async (key, expiresInSeconds = 900) => {
  if (!key) {
    throw new Error("S3 key is required");
  }

  const bucket = getBucketName();
  const client = getS3Client();

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds }
    );
  } catch (error) {
    console.error("S3 presigned URL failed:", error);
    throw new Error("Failed to generate download URL");
  }
};

module.exports = {
  uploadDocumentToS3,
  getPresignedDownloadUrl,
  buildUniqueKey,
};
