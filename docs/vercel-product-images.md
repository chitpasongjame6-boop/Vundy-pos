# Product Images on S3

Uploaded product images and store/POS logos are stored in S3 only. The app does not write runtime uploads into the local filesystem and does not store uploaded images as base64 data URLs.

## Behavior

- Uploaded images are saved through `src/lib/object-storage.ts`.
- S3 configuration is required before uploading images.
- Product records and store settings store only the public image URL returned after upload.
- If S3 is not configured, image upload throws a configuration error.

## S3 Environment

```env
S3_BUCKET="your-bucket-name"
S3_REGION="ap-southeast-1"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
```

Optional:

```env
S3_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
S3_FORCE_PATH_STYLE="true"
S3_PUBLIC_URL_PREFIX="https://cdn.example.com"
S3_ACL="public-read"
```

`S3_PUBLIC_URL_PREFIX` is recommended when the bucket is served through a CDN, Cloudflare R2 public domain, or custom domain. The bucket/object must be publicly readable for `next/image` and printed bills to display the image.

## Size Limit

Server Action upload body size is configured in `next.config.ts` as `8mb`.

## Production Notes

For stricter production setups, use a CDN domain in `S3_PUBLIC_URL_PREFIX` and keep bucket write credentials private in environment variables.
