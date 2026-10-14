import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = send; },
  PutObjectCommand: class { constructor(public input: Record<string, unknown>) {} }
}));

async function photo() {
  const bytes = await sharp({ create: { width: 200, height: 100, channels: 3, background: "blue" } }).png().toBuffer();
  return new File([new Uint8Array(bytes)], "photo.png", { type: "image/png" });
}

describe("product image storage", () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset().mockResolvedValue({});
    vi.stubEnv("R2_ACCOUNT_ID", "test-account");
    vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("R2_PUBLIC_URL", "https://images.example.com/");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("uploads WebP bytes with a .webp key and the correct content type", async () => {
    const { saveUploadedImage } = await import("./object-storage");
    const url = await saveUploadedImage(await photo(), { folder: "products", fileNamePrefix: "product", compressToWebp: true });
    expect(url).toMatch(/^https:\/\/images\.example\.com\/products\/product-.*\.webp$/);
    const command = send.mock.calls[0][0];
    expect(command.input.ContentType).toBe("image/webp");
    expect(command.input.Bucket).toBe("test-bucket");
    expect(command.input).not.toHaveProperty("ACL");
    expect((await sharp(command.input.Body as Buffer).metadata()).format).toBe("webp");
  });

  it("keeps local fallback in WebP format too", async () => {
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    const { saveUploadedImage } = await import("./object-storage");
    const url = await saveUploadedImage(await photo(), { folder: "products", compressToWebp: true });
    expect(url).toMatch(/^data:image\/webp;base64,/);
    expect(send).not.toHaveBeenCalled();
  });

  it("handles unavailable R2 without reverting to the original PNG", async () => {
    send.mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { saveUploadedImage } = await import("./object-storage");
    const url = await saveUploadedImage(await photo(), { folder: "products", compressToWebp: true });
    expect(url).toMatch(/^data:image\/webp;base64,/);
  });

  it("leaves absent product uploads empty and preserves existing logo behavior", async () => {
    const { saveUploadedImage } = await import("./object-storage");
    expect(await saveUploadedImage(null, { folder: "products", compressToWebp: true })).toBeNull();
    const url = await saveUploadedImage(await photo(), { folder: "logos" });
    expect(url).toMatch(/\.png$/);
    expect(send.mock.calls[0][0].input.ContentType).toBe("image/png");
  });
});
