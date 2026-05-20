# Settings Module

## Bill Size And Font

- ຕົວຢ່າງບິນ `/settings/bill-preview` ແລະປຸ່ມ `ປິ້ນບິນ` ໃນປະຫວັດອໍເດີໃຊ້ຂະໜາດ `100mm x 150mm`.
- ໂລໂກ້ໃນບິນຕັ້ງຂະໜາດສູງສຸດປະມານ `128px x 82px`.
- ໜ້າປິ້ນບິນໃຊ້ font `Noto Sans Lao` ຈາກໄຟລ໌ local ໃນ `public/fonts`; ເນື່ອງຈາກໜ້າປິ້ນເປັນ `about:blank` ຈຶ່ງປະກາດ `@font-face` ໃນ HTML ຂອງບິນໂດຍກົງ, ບັງຄັບ font-family ກັບທຸກ element, ແລະລໍຖ້າ font ໂຫຼດກ່ອນສັ່ງ print.

ໄຟລ໌ຫຼັກ:

- `src/app/settings/page.tsx`
- `src/actions/settings.action.ts`
- `src/lib/utils.ts`

## ໝວດໝູ່ສິນຄ້າ

ໜ້າ `Settings` ມີກ່ອງ `ໝວດໝູ່ສິນຄ້າ` ສໍາລັບເພີ່ມ ແລະ ລຶບໝວດໝູ່ທີ່ຈະໃຊ້ໃນລະບົບ.

- ເພີ່ມໝວດໝູ່ຜ່ານ `createCategory`
- ລຶບໝວດໝູ່ໂດຍປ່ຽນ `isActive` ເປັນ `false` ຜ່ານ `deleteCategory`
- ລາຍການໝວດໝູ່ຖືກດຶງດ້ວຍ `getCategories`
- ໝວດໝູ່ຈະໄປສະແດງໃນໜ້າເພີ່ມສິນຄ້າ, ຕົວກອງໜ້າສິນຄ້າ, ແລະຕົວກອງໜ້າອໍເດີ

ຖ້າມີ `DATABASE_URL` ຂໍ້ມູນຈະບັນທຶກລົງ MongoDB collection `categories`. ຖ້າບໍ່ມີ `DATABASE_URL` ລະບົບຈະບັນທຶກໃນ `.local-data/stock-order-store.json` ເພື່ອໃຫ້ທົດສອບປຸ່ມໄດ້ຈິງ.

## ຂໍ້ມູນຮ້ານ ແລະ ບິນຂົນສົ່ງ

ໜ້າ `Settings` ມີກ່ອງ `ຂໍ້ມູນຮ້ານ` ສໍາລັບຕັ້ງຊື່ຮ້ານ ແລະອັບໂຫຼດໂລໂກ້.

- ຊື່ຮ້ານ default: `VUNDY Beauty & Cosmetice`
- ຂໍ້ມູນໃຕ້ຊື່ຮ້ານໃຊ້ສະແດງ subtitle ໃນໃບປິ້ນບິນ
- ຂໍ້ມູນເພີ່ມໃຕ້ຊື່ຮ້ານໃຊ້ສໍາລັບຂໍ້ຄວາມແຖວທີ 3 ເຊັ່ນ Facebook, Tiktok, ຫຼືເບີໂທຮ້ານ
- ໂລໂກ້ default: `public/vundy-logo.jpeg`
- ປຸ່ມ `ເບິ່ງຕົວຢ່າງບິນ` ເປີດໜ້າ `/settings/bill-preview`
- ປຸ່ມ `ປິ້ນບິນ` ໃນປະຫວັດອໍເດີຈະໃຊ້ຊື່ຮ້ານ ແລະໂລໂກ້ຈາກ Settings

## ບິນຂາຍໜ້າຮ້ານ POS

ໜ້າ `Settings` ມີກ່ອງ `ບິນຂາຍໜ້າຮ້ານ` ແຍກຈາກຂໍ້ມູນບິນຂົນສົ່ງ.

- action ທີ່ໃຊ້: `updatePosReceiptSettings`
- fields: `posReceiptName`, `posReceiptSubtitle`, `posReceiptNote`, `posReceiptLogoUrl`
- ໃບບິນ POS ໃນ `/pos` ຈະໃຊ້ຂໍ້ມູນຊຸດນີ້ເທົ່ານັ້ນ
- ການແກ້ໄຂບິນ POS ບໍ່ກະທົບໃບບິນຂົນສົ່ງຂອງອໍເດີອອນລາຍ

## ຂໍ້ມູນຕັ້ງຄ່າປັດຈຸບັນ

ບໍລິສັດຂົນສົ່ງ:

- ຮຸ່ງອາລຸນ
- ອານຸສິດ
- ມີໄຊ
- Unitel

ສະຖານະອໍເດີ ແລະ ສີຢູ່ໃນ `statusConfig` ທີ່ `src/lib/utils.ts`

## ລຶບຂໍ້ມູນເພື່ອເລີ່ມໃຊ້ງານຈິງ

ໜ້າ `Settings` ມີກ່ອງ `ລຶບຂໍ້ມູນທັງໝົດ` ສໍາລັບລ້າງຂໍ້ມູນທົດສອບກ່ອນເລີ່ມກອກຂໍ້ມູນຈິງ.

- ຕ້ອງພິມ `DELETE` ໃນຊ່ອງຢືນຢັນກ່ອນກົດລຶບ
- action ທີ່ໃຊ້: `clearAllBusinessData`
- ຂໍ້ມູນທີ່ລຶບ: ສິນຄ້າ, ອໍເດີ, ຍອດຂາຍໜ້າຮ້ານ, ໝວດໝູ່ສິນຄ້າ
- ຂໍ້ມູນທີ່ເກັບໄວ້: ຊື່ຮ້ານ, ຂໍ້ມູນໃບບິນ, ໂລໂກ້
- ຖ້າມີ `DATABASE_URL` ຈະລຶບຈາກ MongoDB collections `orders`, `sales`, `products`, `categories`
- ຖ້າບໍ່ມີ `DATABASE_URL` ຈະລຶບຈາກ `.local-data/stock-order-store.json`

## ວຽກຕໍ່

- ຍ້າຍບໍລິສັດຂົນສົ່ງໄປເກັບໃນຖານຂໍ້ມູນ
- ເຮັດໜ້າຈໍເພີ່ມ ແກ້ໄຂ ແລະ ປິດໃຊ້ງານບໍລິສັດຂົນສົ່ງ
- ເຮັດ role permission ສໍາລັບຜູ້ໃຊ້
- ເພີ່ມຂໍ້ມູນຮ້ານ ເຊັ່ນ ຊື່ຮ້ານ ເບີໂທ ທີ່ຢູ່ ແລະ ໂລໂກ້
