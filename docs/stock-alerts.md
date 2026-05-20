# Stock Alerts

ໜ້າ `/stock-alerts` ໃຊ້ສໍາລັບລວມສິນຄ້າທີ່ໃກ້ໝົດ ຫຼື ໝົດສະຕ໋ອກ.

## ການເຮັດວຽກ

- ດຶງສິນຄ້າທີ່ `isActive = true`.
- ກວດທຸກ variant ຂອງສິນຄ້າ.
- ສະແດງຖ້າ `stock <= lowStockAlert`.
- ຖ້າ `stock <= 0` ຈະສະແດງເປັນໝົດສະຕ໋ອກ.
- ແຕ່ລະລາຍການມີຟອມເພີ່ມສະຕ໋ອກໂດຍໃຊ້ `updateProductVariantStock`.

## ໄຟລ໌ຫຼັກ

- `src/app/stock-alerts/page.tsx`
- `src/actions/product.action.ts`
