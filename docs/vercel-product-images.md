# Product Images on Vercel

Uploaded product images and store/POS logos use Cloudflare R2. The app does not write runtime uploads into `public/uploads` on Vercel.

## Behavior

- Uploaded images are saved through `src/lib/object-storage.ts`.
- If R2 is configured, product records and store settings store the public object URL.
- If R2 is not configured or upload fails, small images fall back to inline `data:image/...;base64,...` storage.
- Product uploads are decoded, auto-oriented, resized within 1600 × 1600 without enlargement or cropping, and encoded as WebP at quality 82 before storage. Transparency is preserved. Animated uploads use the first frame. Original product images are limited to 5 MB and 40 million pixels. Invalid/oversized product images show a form error.
- Both R2 object keys and MIME types use `.webp` / `image/webp`; the inline fallback also contains compressed WebP bytes.
- If the compressed fallback is too large, product saving returns a visible error. Logo uploads retain the previous format and fallback behavior.

## Cloudflare R2 Environment

```env
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_BUCKET_NAME="your-r2-bucket-name"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_PUBLIC_URL="https://images.example.com"
```

`R2_PUBLIC_URL` must be a custom domain connected to the bucket (recommended for production) or its public `r2.dev` URL. It must not be the private R2 S3 API endpoint. Public access is required for `next/image` and printed bills to display the image.

## Size Limit

Server Action upload body size is configured in `next.config.ts` as `8mb`.

Inline fallback images are limited to about 1.5 MB to avoid oversized MongoDB documents.

## Production Notes

For production, connect a custom domain to the R2 bucket and keep the R2 write credentials private in server-side environment variables.
