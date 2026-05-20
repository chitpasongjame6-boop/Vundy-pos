# Architecture

ໂປຣເຈັກໃຊ້ Next.js App Router ແລະແບ່ງງານເປັນ 4 ຊັ້ນຫຼັກ

## App Routes

ຢູ່ໃນ `src/app`

- `/dashboard` ພາບລວມຍອດຂາຍ ກໍາໄລ ສະຕ໋ອກ ແລະ ອໍເດີຫຼ້າສຸດ
- `/products` ລາຍການສິນຄ້າ ຄົ້ນຫາ ແລະ ກອງໝວດໝູ່
- `/products/new` ຟອມເພີ່ມສິນຄ້າ
- `/pos` ຂາຍໜ້າຮ້ານ ສະແກນສິນຄ້າ ຄິດໄລ່ເງິນ ຕັດສະຕ໋ອກ ແລະປິ້ນບິນ
- `/orders` ລາຍການອໍເດີ ຄົ້ນຫາ ແລະ ກອງສະຖານະ
- `/orders/new` ຟອມສ້າງອໍເດີ
- `/orders/history` ປະຫວັດອໍເດີທັງໝົດ
- `/pos/history` ປະຫວັດບິນຂາຍໜ້າຮ້ານ ຄົ້ນຫາ ກອງວັນທີ ກອງວິທີຊໍາລະ ແລະປິ້ນບິນຊໍ້າ
- `/pos/closing` ປິດຍອດຂາຍໜ້າຮ້ານປະຈໍາວັນ
- `/sold-products` ປະຫວັດສິນຄ້າທີ່ຂາຍ ແຍກອອນລາຍ ຂາຍໜ້າຮ້ານ ແລະ ທັງໝົດ
- `/exports` export ຂໍ້ມູນສິນຄ້າ, ອໍເດີ, POS, ແລະປິດຍອດ ເປັນໜ້າອ່ານງ່າຍ/Save PDF
- `/reports` ລາຍງານກໍາໄລ
- `/settings` ຂໍ້ມູນຕັ້ງຄ່າພື້ນຖານ

## Components

ຢູ່ໃນ `src/components`

- `layout` sidebar desktop, bottom nav mobile, page header
- Mobile bottom nav ຈະຊ່ອນອັດຕະໂນມັດເມື່ອ input/select/textarea ຖືກ focus ເພື່ອບໍ່ໃຫ້ທັບ keyboard ແລະຊ່ອງກອກຂໍ້ມູນ
- Active navigation item ໃຊ້ພື້ນຫຼັງສີອ່ອນ ຂອບບາງ ແລະຕົວໜັງສືສີເຂັ້ມ ເພື່ອໃຫ້ອ່ານຊັດກວ່າພື້ນດໍາ
- Active navigation ເລືອກຈາກ path ທີ່ກົງແລະຍາວທີ່ສຸດ ເພື່ອບໍ່ໃຫ້ `/orders` ແລະ `/orders/history` active ພ້ອມກັນ
- `ui` button, card, badge, input, select, textarea
- `dashboard` stat card ແລະ chart
- `products` product form, filters, grid cards
- `orders` order form, filters, cards

## Actions

ຢູ່ໃນ `src/actions`

- `product.action.ts` ອ່ານສິນຄ້າ ເພີ່ມສິນຄ້າ ປັບສະຕ໋ອກ ປິດການຂາຍ
- `pos.action.ts` ອ່ານຍອດຂາຍໜ້າຮ້ານ ບັນທຶກ POS sale, ຕັດສະຕ໋ອກ, ສະຫຼຸບວິທີຊໍາລະ ແລະດຶງປະຫວັດບິນ
- `order.action.ts` ອ່ານອໍເດີ ສ້າງອໍເດີ ປ່ຽນສະຖານະ ບັນທຶກເຫດຜົນຕີກັບ ແລະ ຮັບສິນຄ້າຄືນເຂົ້າສະຕ໋ອກ
- `dashboard.action.ts` ລວມຂໍ້ມູນເພື່ອສະແດງ dashboard ແລະ reports
- `sold-products.action.ts` ລວມປະຫວັດສິນຄ້າທີ່ຂາຍ, ນັບອອນລາຍສະເພາະ `SHIPPED` ແລະນັບ POS ທີ່ບັນທຶກແລ້ວ

Actions ຈະໃຊ້ Prisma ເມື່ອມີ `DATABASE_URL`. ຖ້າຍັງບໍ່ມີຖານຂໍ້ມູນ ລະບົບຈະໃຊ້ local dev storage ທີ່ `.local-data/stock-order-store.json` ເພື່ອໃຫ້ປຸ່ມເພີ່ມ/ແກ້ໄຂ/ລຶບ ທົດສອບໄດ້ຈິງ

## Shared Code

- `src/lib/prisma.ts` Prisma singleton
- `src/lib/utils.ts` format ເງິນ ວັນທີ status config ແລະສູດຄໍານວນ
- `src/lib/mock-data.ts` ຂໍ້ມູນຕົວຢ່າງ
- `src/types/index.ts` type ກາງຂອງລະບົບ
