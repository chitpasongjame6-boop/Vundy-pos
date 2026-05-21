# Barcode Labels

ໜ້າ `/barcodes` ໃຊ້ສໍາລັບພິມສະຕິກເກີ barcode ຈາກ SKU ຂອງສິນຄ້າ.

## ການເຮັດວຽກ

- ດຶງສິນຄ້າ active ແລະ variant ທັງໝົດ.
- ມີໂໝດ `ລາຍການສິນຄ້າ` ສໍາລັບພິມຈາກ SKU ທີ່ບັນທຶກໃນສິນຄ້າ.
- ມີໂໝດ `ສ້າງເອງ` ສໍາລັບປ້ອນຊື່ສິນຄ້າ ແລະລະຫັດ barcode ເພື່ອພິມສະເພາະລາຍການນັ້ນ, ໂດຍບໍ່ບັນທຶກ SKU ໃໝ່ລົງສິນຄ້າ.
- ສ້າງ barcode ແບບ Code 39 ດ້ວຍ SVG.
- SKU ຈະຖືກແປງເປັນຕົວພິມໃຫຍ່ ແລະຕົວອັກສອນທີ່ Code 39 ບໍ່ຮອງຮັບຈະຖືກແທນດ້ວຍ `-`.
- ຂະໜາດສະຕິກເກີຕອນພິມແມ່ນ 50 x 30 mm.

## ໄຟລ໌ຫຼັກ

- `src/app/barcodes/page.tsx`
- `src/components/barcodes/barcode-print-button.tsx`
- `src/app/globals.css`
