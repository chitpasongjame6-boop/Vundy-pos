# Product Images on Vercel

Uploaded product images and store/POS logos use object storage when S3-compatible settings are available. The app does not write runtime uploads into `public/uploads` on Vercel.

## Behavior

- Uploaded images are saved through `src/lib/object-storage.ts`.
- If S3 is configured, product records and store settings store the public object URL.
- If S3 is not configured or upload fails, small images fall back to inline `data:image/...;base64,...` storage.
- If the fallback image is too large, the product/settings save continues without the image.

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

Inline fallback images are limited to about 1.5 MB to avoid oversized MongoDB documents.

## Production Notes

For stricter production setups, use a CDN domain in `S3_PUBLIC_URL_PREFIX` and keep bucket write credentials private in environment variables.
