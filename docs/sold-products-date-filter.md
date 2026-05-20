# Sold Products Date Filter

ໜ້າ `/sold-products` ໃຊ້ສໍາລັບເບິ່ງປະຫວັດສິນຄ້າທີ່ຂາຍແລ້ວ ແລະສາມາດກອງຕາມວັນທີໄດ້.

## ວິທີເຮັດວຽກ

- UI ໃຊ້ dropdown ແຍກ `day`, `month`, `year` ແທນ input `type="date"` ເພື່ອຫຼີກປັນຫາ browser ສົ່ງຄ່າ `date=` ວ່າງ.
- `src/app/sold-products/page.tsx` ນໍາ `day`, `month`, `year` ມາປະກອບເປັນ `YYYY-MM-DD`.
- `src/actions/sold-products.action.ts` ແປງວັນທີເປັນຊ່ວງເວລາເລີ່ມວັນຈົນຮອດກ່ອນວັນຖັດໄປ.
- ອອນລາຍນັບສະເພາະອໍເດີສະຖານະ `SHIPPED`.
- ຂາຍໜ້າຮ້ານນັບສະເພາະບິນ POS ທີ່ຍັງ active.
- ສະຫຼຸບຈໍານວນຂາຍ, ຍອດຂາຍ, ແລະກໍາໄລຄໍານວນຈາກລາຍການຫຼັງກອງວັນທີແລ້ວ.

## ໄຟລ໌ທີ່ແກ້

- `src/app/sold-products/page.tsx`
- `src/actions/sold-products.action.ts`
