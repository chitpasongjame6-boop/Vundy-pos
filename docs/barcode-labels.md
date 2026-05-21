# Barcode Labels

ໜ້າ `/barcodes` ໃຊ້ສໍາລັບພິມສະຕິກເກີ barcode ສະເພາະລາຍການທີ່ຜູ້ໃຊ້ສ້າງເອງ.

## ການເຮັດວຽກ

- ບໍ່ດຶງສິນຄ້າທັງໝົດມາສ້າງ barcode ອັດຕະໂນມັດ.
- ຜູ້ໃຊ້ປ້ອນຊື່ສິນຄ້າ, ຂະໜາດ/ຮຸ່ນ, ແລະລະຫັດ barcode ເອງ.
- ການສ້າງ barcode ໃນໜ້ານີ້ໃຊ້ສໍາລັບພິມຢ່າງດຽວ ແລະບໍ່ບັນທຶກ SKU ໃໝ່ລົງສິນຄ້າ.
- ສ້າງ barcode ແບບ Code 39 ດ້ວຍ SVG.
- SKU ຈະຖືກແປງເປັນຕົວພິມໃຫຍ່ ແລະຕົວອັກສອນທີ່ Code 39 ບໍ່ຮອງຮັບຈະຖືກແທນດ້ວຍ `-`.
- ຂະໜາດສະຕິກເກີຕອນພິມແມ່ນ 50 x 30 mm.

## ໄຟລ໌ຫຼັກ

- `src/app/barcodes/page.tsx`
- `src/components/barcodes/barcode-print-button.tsx`
- `src/app/globals.css`
