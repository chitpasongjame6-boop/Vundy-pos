# Product Images on Vercel

## Problem

Vercel serverless functions cannot persist uploaded files into `public/uploads` at runtime. Writing product images there can cause a 500 error in production.

## Current Behavior

`saveProductImage()` in `src/actions/product.action.ts` now behaves differently by environment:

- Local development: writes image files to `public/uploads`
- Vercel production: stores small uploaded images as `data:image/...;base64,...` strings in MongoDB

## Size Limit

Inline images are limited to about 1.5 MB. Larger files are ignored and the product is still saved without an image.

## Future Improvement

For long-term production use, move product images to object storage such as Vercel Blob, S3, or Cloudinary, and store only the public URL in MongoDB.
