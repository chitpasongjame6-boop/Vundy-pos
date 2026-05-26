# POS Receipt Print Quality

ໃບບິນ POS ໃຊ້ HTML ກາງທີ່ `src/components/pos/pos-receipt-html.ts` ເພື່ອໃຫ້ການປິ້ນຫຼັງຂາຍ ແລະ ການປິ້ນຊໍ້າຈາກປະຫວັດບິນ ອອກມາຄືກັນ.

ສິ່ງທີ່ປັບເພື່ອໃຫ້ບິນ 80mm ອ່ານຊັດ:

- ກໍານົດ `@page` ເປັນ 80mm ແຕ່ໃຊ້ພື້ນທີ່ພິມ 72mm ຂ້າງໃນ ເພື່ອຫຼຸດການຖືກ browser/printer ຍໍ່.
- ໃຊ້ font `Noto Sans Lao` ຈາກ `public/fonts` ໃນໜ້າປິ້ນໂດຍກົງ.
- ເພີ່ມຂະໜາດຕົວໜັງສື ແລະ ໃຫ້ສີຕົວໜັງສືເປັນດໍາ.
- ປ່ຽນເສັ້ນແບ່ງຈາກເສັ້ນປະເປັນເສັ້ນທຶບສີດໍາ.
- ບັງຄັບ `print-color-adjust` ເພື່ອໃຫ້ browser ບໍ່ຫຼຸດຄວາມເຂັ້ມຂອງສີຕອນປິ້ນ.

ຖ້າຍັງບໍ່ຄົມຢູ່ ຈຸດທີ່ຕ້ອງເບິ່ງຕໍ່ແມ່ນ setting ຂອງ printer driver: ປິດ scale, ເລືອກ paper size 80mm, ແລະຕັ້ງ density/speed ຂອງຫົວພິມໃຫ້ເໝາະ.
