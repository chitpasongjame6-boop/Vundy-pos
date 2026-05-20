# Export Print CSS

ເອກະສານນີ້ອະທິບາຍການແກ້ໄຂການພິມໜ້າ `/exports`.

## ປັນຫາ

ໜ້າ Export ໃຊ້ `window.print()` ຈາກໜ້າຈິງ. ຖ້າ print CSS ບໍ່ຊ່ອນ layout, browser ຈະດຶງ sidebar ຫຼື mobile bottom navigation ໄປຢູ່ໃນ PDF ນໍາ.

## ການແກ້

- ເພີ່ມ print CSS ໃນ `src/app/globals.css`.
- ຊ່ອນ `.app-shell > aside` ແລະ `.mobile-bottom-nav` ເມື່ອພິມ.
- ປັບ `.content-safe-bottom` ໃຫ້ padding ເປັນ `0` ຕອນພິມ.
- ປັບ `.export-report .overflow-x-auto` ໃຫ້ `overflow: visible` ເພື່ອບໍ່ໃຫ້ scrollbar ຕິດໄປໃນ PDF.

## ໄຟລ໌ທີ່ແກ້

- `src/app/globals.css`
