import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { compressProductImage, MAX_PRODUCT_IMAGE_BYTES, ProductImageError } from "./product-image";

function imageFile(buffer: Buffer, type = "image/png") {
  return new File([new Uint8Array(buffer)], "product", { type });
}

describe("product WebP compression", () => {
  it("converts large photos to actual smaller WebP bytes and keeps their aspect ratio", async () => {
    const input = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#7c3aed" } }).png().toBuffer();
    const output = await compressProductImage(imageFile(input));
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
    expect(output.byteLength).toBeLessThan(input.byteLength);
  });

  it("preserves transparency and does not enlarge small images", async () => {
    const input = await sharp({ create: { width: 80, height: 40, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    const metadata = await sharp(await compressProductImage(imageFile(input))).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 80, height: 40, hasAlpha: true });
  });

  it("auto-orients a phone photo and removes its EXIF metadata", async () => {
    const input = await sharp({ create: { width: 100, height: 60, channels: 3, background: "red" } })
      .withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const metadata = await sharp(await compressProductImage(imageFile(input, "image/jpeg"))).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 60, height: 100 });
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects malformed files, unsupported formats and oversized input", async () => {
    await expect(compressProductImage(imageFile(Buffer.from("not an image")))).rejects.toBeInstanceOf(ProductImageError);
    await expect(compressProductImage(imageFile(Buffer.from("<svg/>"), "image/svg+xml"))).rejects.toBeInstanceOf(ProductImageError);
    await expect(compressProductImage(imageFile(Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1)))).rejects.toBeInstanceOf(ProductImageError);
  });
});
