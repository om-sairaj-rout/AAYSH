const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { loadEnv } = require("../config/loadEnv");

loadEnv();

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const LOCAL_BUCKET = "local";
const STORAGE_ROOT = path.join(__dirname, "..", "storage");

let s3Client = null;

const readEnv = (...names) => {
  for (const name of names) {
    const raw = process.env[name];
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      return String(raw).trim();
    }
  }
  return "";
};

const isS3Configured = () =>
  Boolean(
    readEnv("AWS_S3_BUCKET_NAME", "AWS_S3_BUCKET", "S3_BUCKET_NAME") &&
      readEnv("AWS_REGION") &&
      readEnv("AWS_ACCESS_KEY_ID") &&
      readEnv("AWS_SECRET_ACCESS_KEY")
  );

const getBucketName = () => {
  const bucket = readEnv("AWS_S3_BUCKET_NAME", "AWS_S3_BUCKET", "S3_BUCKET_NAME");
  if (!bucket) {
    throw new Error("Missing required environment variable: AWS_S3_BUCKET_NAME");
  }
  return bucket;
};

const getS3Client = () => {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: readEnv("AWS_REGION"),
    credentials: {
      accessKeyId: readEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: readEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });

  return s3Client;
};

const sanitizeFileName = (name = "file") =>
  String(name).replace(/[^a-zA-Z0-9._-]/g, "_");

const buildUniqueKey = (folder, originalName) => {
  const ext = path.extname(originalName || "");
  const base = sanitizeFileName(path.basename(originalName || "file", ext));
  const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  return `${folder}/${unique}-${base}${ext}`;
};

const isLocalDocumentKey = (key) =>
  String(key || "").startsWith("local:") || String(key || "").startsWith("local/");

const resolveLocalDocumentPath = (key) => {
  const relative = String(key || "")
    .replace(/^local:/, "")
    .replace(/^local\//, "");
  const normalized = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(STORAGE_ROOT, normalized);
};

const uploadDocumentToLocal = async ({ buffer, originalName, folder }) => {
  const key = buildUniqueKey(folder, originalName);
  const absolutePath = path.join(STORAGE_ROOT, key);
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, buffer);

  return {
    s3Key: `local:${key.replace(/\\/g, "/")}`,
    s3Bucket: LOCAL_BUCKET,
    fileName: originalName || "",
  };
};

/**
 * Upload a document buffer to private S3 (or local storage when S3 is not configured).
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

  if (!isS3Configured()) {
    console.warn(
      "AWS S3 is not fully configured — saving order document to local storage/",
    );
    return uploadDocumentToLocal({ buffer, originalName, folder });
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
    throw new Error(error.message || "Failed to upload document to storage");
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

  if (isLocalDocumentKey(key)) {
    return null;
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
  isS3Configured,
  isLocalDocumentKey,
  resolveLocalDocumentPath,
  LOCAL_BUCKET,
};
