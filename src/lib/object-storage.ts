import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { compressProductImage, ProductImageError } from "./product-image";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};
const maxInlineImageSize = 1.5 * 1024 * 1024;
const maxUploadedImageSize = 5 * 1024 * 1024;

type SaveUploadedImageOptions = {
  folder: string;
  fileNamePrefix?: string;
  compressToWebp?: boolean;
};

type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

let r2Client: S3Client | null = null;

export async function saveUploadedImage(
  value: FormDataEntryValue | null,
  options: SaveUploadedImageOptions
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  if (!options.compressToWebp && (value.size > maxUploadedImageSize || !imageExtensions[value.type])) {
    return null;
  }

  const buffer = options.compressToWebp
    ? await compressProductImage(value)
    : Buffer.from(await value.arrayBuffer());
  const extension = options.compressToWebp ? "webp" : imageExtensions[value.type];
  const contentType = options.compressToWebp ? "image/webp" : value.type;
  function inlineFallback() {
    const url = buildInlineImageUrl(buffer, contentType);
    if (!url && options.compressToWebp) {
      throw new ProductImageError("ບັນທຶກຮູບບໍ່ໄດ້ ກະລຸນາກວດການເຊື່ອມຕໍ່ R2 ຫຼື ເລືອກຮູບທີ່ນ້ອຍກວ່າ");
    }
    return url;
  }
  const r2Config = getR2Config();

  if (!r2Config) {
    return inlineFallback();
  }

  const key = buildObjectKey(options.folder, options.fileNamePrefix, extension);
  try {
    await getR2Client(r2Config).send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable"
      })
    );
  } catch {
    console.error("Cloudflare R2 image upload failed; using inline image fallback.");
    return inlineFallback();
  }

  return buildPublicObjectUrl(r2Config, key);
}

export function getObjectStorageHealth() {
  const config = getR2Config();

  return {
    provider: "cloudflare-r2",
    r2Configured: Boolean(config),
    bucket: config?.bucket ?? null,
    accountIdConfigured: Boolean(config?.accountId),
    publicUrlConfigured: Boolean(config?.publicUrl)
  };
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) {
    return null;
  }

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl
  };
}

function getR2Client(config: R2Config) {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  return r2Client;
}

function buildObjectKey(folder: string, prefix = "upload", extension: string) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9-_]/g, "-") || "upload";

  return `${cleanFolder}/${cleanPrefix}-${crypto.randomUUID()}.${extension}`;
}

function buildPublicObjectUrl(config: R2Config, key: string) {
  return `${config.publicUrl.replace(/\/+$/g, "")}/${key}`;
}

function buildInlineImageUrl(buffer: Buffer, contentType: string) {
  if (buffer.byteLength > maxInlineImageSize) {
    return null;
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
