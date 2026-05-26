import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};
const maxInlineImageSize = 1.5 * 1024 * 1024;

type SaveUploadedImageOptions = {
  folder: string;
  fileNamePrefix?: string;
};

type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicUrlPrefix?: string;
};

let s3Client: S3Client | null = null;

export async function saveUploadedImage(
  value: FormDataEntryValue | null,
  options: SaveUploadedImageOptions
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = imageExtensions[value.type];

  if (!extension) {
    return null;
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  const s3Config = getS3Config();

  if (!s3Config) {
    return buildInlineImageUrl(buffer, value.type);
  }

  const key = buildObjectKey(options.folder, options.fileNamePrefix, extension);
  try {
    await getS3Client(s3Config).send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: buffer,
        ContentType: value.type,
        CacheControl: "public, max-age=31536000, immutable",
        ACL: process.env.S3_ACL === "public-read" ? "public-read" : undefined
      })
    );
  } catch {
    return buildInlineImageUrl(buffer, value.type);
  }

  return buildPublicObjectUrl(s3Config, key);
}

export function getObjectStorageHealth() {
  const config = getS3Config();

  return {
    s3Configured: Boolean(config),
    bucket: config?.bucket ?? null,
    region: config?.region ?? null,
    endpointConfigured: Boolean(config?.endpoint),
    publicUrlPrefixConfigured: Boolean(config?.publicUrlPrefix)
  };
}

function getS3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID?.trim() ?? process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY?.trim() ??
    process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE) ?? Boolean(endpoint),
    publicUrlPrefix: process.env.S3_PUBLIC_URL_PREFIX?.trim() || undefined
  };
}

function getS3Client(config: S3Config) {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  return s3Client;
}

function buildObjectKey(folder: string, prefix = "upload", extension: string) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9-_]/g, "-") || "upload";

  return `${cleanFolder}/${cleanPrefix}-${crypto.randomUUID()}.${extension}`;
}

function buildPublicObjectUrl(config: S3Config, key: string) {
  if (config.publicUrlPrefix) {
    return `${config.publicUrlPrefix.replace(/\/+$/g, "")}/${key}`;
  }

  if (config.endpoint) {
    const endpointUrl = new URL(config.endpoint);

    if (config.forcePathStyle) {
      return `${endpointUrl.origin}/${config.bucket}/${key}`;
    }

    return `${endpointUrl.protocol}//${config.bucket}.${endpointUrl.host}/${key}`;
  }

  const host =
    config.region === "us-east-1"
      ? `${config.bucket}.s3.amazonaws.com`
      : `${config.bucket}.s3.${config.region}.amazonaws.com`;

  return `https://${host}/${key}`;
}

function buildInlineImageUrl(buffer: Buffer, contentType: string) {
  if (buffer.byteLength > maxInlineImageSize) {
    return null;
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function parseBoolean(value?: string) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}
