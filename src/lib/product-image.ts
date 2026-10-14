import sharp from "sharp";

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export class ProductImageError extends Error {}

export async function compressProductImage(file: File) {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageError("ຮູບໃຫຍ່ເກີນ 5 MB ກະລຸນາເລືອກຮູບທີ່ນ້ອຍກວ່າ");
  }
  if (!supportedTypes.has(file.type)) {
    throw new ProductImageError("ກະລຸນາໃຊ້ຮູບ JPG, PNG, WebP ຫຼື GIF");
  }
  try {
    // Product photos are still images; use the first frame for animated uploads.
    return await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40_000_000,
      animated: false,
      failOn: "warning"
    })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    throw new ProductImageError("ອ່ານຮູບບໍ່ໄດ້ ຫຼື ຮູບມີຂະໜາດໃຫຍ່ເກີນໄປ ກະລຸນາເລືອກຮູບໃໝ່");
  }
}
