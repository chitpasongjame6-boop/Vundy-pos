# POS Receipt Print Quality

ໃບບິນ POS ໃຊ້ HTML ກາງທີ່ `src/components/pos/pos-receipt-html.ts` ເພື່ອໃຫ້ການປິ້ນຫຼັງຂາຍ ແລະ ການປິ້ນຊໍ້າຈາກປະຫວັດບິນ ອອກມາຄືກັນ.

ສິ່ງທີ່ປັບເພື່ອໃຫ້ບິນ 80mm ອ່ານຊັດ:

- ກໍານົດ `@page` ເປັນ 80mm ແຕ່ໃຊ້ພື້ນທີ່ພິມ 72mm ຂ້າງໃນ ເພື່ອຫຼຸດການຖືກ browser/printer ຍໍ່.
- ໃຊ້ font `Noto Sans Lao` ຈາກ `public/fonts` ໃນໜ້າປິ້ນໂດຍກົງ.
- ເພີ່ມຂະໜາດຕົວໜັງສື ແລະ ໃຫ້ສີຕົວໜັງສືເປັນດໍາ.
- ປ່ຽນເສັ້ນແບ່ງຈາກເສັ້ນປະເປັນເສັ້ນທຶບສີດໍາ.
- ບັງຄັບ `print-color-adjust` ເພື່ອໃຫ້ browser ບໍ່ຫຼຸດຄວາມເຂັ້ມຂອງສີຕອນປິ້ນ.
- ຫຼັງຈາກທົດສອບຈາກເຄື່ອງຈິງ ປັບ body, ຊື່ສິນຄ້າ, ລາຄາ ແລະຍອດລວມໃຫ້ໃຊ້ນໍ້າໜັກຕົວໜັງສືໜາຂຶ້ນ ພ້ອມ `-webkit-text-stroke` ບາງໆ ໃນໂໝດ print.
- ຮອບປັບເພີ່ມໃຊ້ `text-shadow` ບາງໆ ກັບຂໍ້ຄວາມທັງໃບບິນ, ເພີ່ມເສັ້ນແບ່ງເປັນ 2px, ແລະເພີ່ມ `filter: contrast(180%)` ໃນໂໝດ print.
- ຮອບທົດສອບຟອນປ່ຽນໃຫ້ໃບບິນ POS ໃຊ້ `Phetsarath OT`, `Saysettha OT`, `Noto Sans Lao` ຕາມລໍາດັບ ເພື່ອໃຫ້ພາສາລາວພິມອອກມາຊັດກວ່າ `Courier New`.
- ຫຼັງຈາກພົບວ່າຕົວໜັງສືໜາເກີນໄປ ຈຶ່ງເອົາ `text-shadow`, `filter: contrast`, ແລະ `-webkit-text-stroke` ອອກ ແລ້ວຫຼຸດ font weight ໃຫ້ຢູ່ປະມານ 500-700.

ຖ້າຍັງບໍ່ຄົມຢູ່ ຈຸດທີ່ຕ້ອງເບິ່ງຕໍ່ແມ່ນ setting ຂອງ printer driver: ປິດ scale, ເລືອກ paper size 80mm, ແລະຕັ້ງ density/speed ຂອງຫົວພິມໃຫ້ເໝາະ.
