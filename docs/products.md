# Products Module

ໄຟລ໌ຫຼັກ:

- `src/app/products/page.tsx`
- `src/app/products/new/page.tsx`
- `src/components/products/product-grid.tsx`
- `src/components/products/product-form.tsx`
- `src/actions/product.action.ts`

## ຟີເຈີທີ່ເຮັດແລ້ວ

- ສະແດງສິນຄ້າແບບ card
- card ສະແດງຂໍ້ມູນສະຫຼຸບ: ຮູບ, ຊື່, ໝວດໝູ່, ລາຄາຕໍ່າສຸດ-ສູງສຸດ, ສະຕ໋ອກລວມ, ຈໍານວນຂະໜາດ
- ກົດ card ເພື່ອເປີດ modal ລາຍລະອຽດສິນຄ້າ ແລະ variants ທັງໝົດ
- Mobile ສະແດງ 2 ຄໍລໍາ
- Desktop ສະແດງ 3 ຄໍລໍາ
- ຄົ້ນຫາຈາກຊື່ສິນຄ້າ ແລະ SKU
- ຮອງຮັບການໃຊ້ SKU ເປັນ Barcode; ສາມາດສະແກນລົງຊ່ອງ `SKU / Barcode` ຕອນເພີ່ມ ຫຼືແກ້ໄຂສິນຄ້າ
- ລະບົບກັນ SKU / Barcode ຊໍ້າທັງໃນຟອມດຽວກັນ ແລະກັບສິນຄ້າອື່ນ
- ກອງຕາມໝວດໝູ່
- ປຸ່ມ Export ໃນໜ້າສິນຄ້າ: CSV ທັງໝົດ 5 ຖັນ (ຊື່, ລະຫັດ, ຕົ້ນທຶນ, ລາຄາຂາຍ, ກຳໄລຕໍ່ໜ່ວຍ); ແຍກແຖວຕາມ SKU ແລະ ສຳລັບເຈົ້າຂອງຮ້ານເທົ່ານັ້ນ
- ໜ້າເພີ່ມສິນຄ້າເລືອກໝວດໝູ່ຈາກ `Settings > ໝວດໝູ່ສິນຄ້າ`
- ສະແດງຕົ້ນທຶນ ລາຄາຂາຍ ແລະ ສະຕ໋ອກ
- ສະແດງ badge ເມື່ອສິນຄ້າໃກ້ໝົດ
- ຟອມເພີ່ມສິນຄ້າຮອງຮັບ variants ຫຼາຍຂະໜາດ ເຊັ່ນ 10ml, 20ml, ຂວດເຕັມ
- ອັບໂຫຼດຮູບສິນຄ້າຈາກເຄື່ອງ ແລະເກັບໃນ Cloudflare R2
- ຮູບສິນຄ້າໃໝ່ຖືກບີບອັດເປັນ WebP, ດ້ານຍາວບໍ່ເກີນ 1600px; GIF ໃຊ້ຮູບທຳອິດ
- ກຳນົດວັນໝົດອາຍຸແຍກຕາມ SKU/ຂະໜາດໃນຟອມເພີ່ມ ແລະ ແກ້ໄຂ; ປ່ອຍວ່າງໄດ້
- ແຈ້ງເຕືອນໃນໜ້າລວມ, ໜ້າແຈ້ງເຕືອນ ແລະ ບັດສິນຄ້າ ລ່ວງໜ້າ 30 ມື້ ຕາມເວລາລາວ; ສະເພາະສະຕ໋ອກທີ່ຍັງເຫຼືອ
- action ສໍາລັບເພີ່ມສິນຄ້າ ປັບສະຕ໋ອກ ແລະ ແກ້ໄຂຂໍ້ມູນສິນຄ້າ
- popup ລາຍລະອຽດສິນຄ້າມີປຸ່ມເພີ່ມສະຕ໋ອກແຍກຕາມ variant ແລະຟອມແກ້ໄຂຊື່, ໝວດໝູ່, ຮູບ, ສະຖານະຂາຍ, SKU, ຕົ້ນທຶນ, ລາຄາຂາຍ, ສະຕ໋ອກ ແລະແຈ້ງເຕືອນໃກ້ໝົດ

Expiry is stored as an optional `ProductVariant.expiryDate` calendar string (`YYYY-MM-DD`). Older products without a date remain valid. Run `npm run prisma:generate` after updating the schema. Alerts are recalculated when opening/refreshing the page, including inactive products with remaining stock. These are in-app alerts, not push/email notifications. This tracks one date per SKU, not separate purchase lots: record the earliest remaining expiry and update it when that lot is exhausted. Existing images are not converted until replaced by an upload.

## ວຽກຕໍ່

- ຜູກປຸ່ມເພີ່ມສະຕ໋ອກໃຫ້ເລືອກ variant ກ່ອນປັບສະຕ໋ອກ
- ເພີ່ມ toast ສະແດງຜົນຈາກ server action
