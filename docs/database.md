# Database

## Promotions and sale price snapshots

`promotions` stores owner-managed `FIXED_PRICE` / `PERCENT` rules, integer values,
explicit product/variant targets, UTC start/end instants and an enable flag. Shop
date-time input is interpreted as Asia/Vientiane (UTC+7). Creating, editing and
pausing promotions creates an audit log. Local-store and JSON backups include rules.

New POS `SaleItem.price` is the effective unit price after the promotion;
`originalPrice`, `promotionId` and `promotionName` preserve the historical offer.
These fields are optional so existing receipts remain readable. `Sale.totalAmount`
is the gross amount before all discounts; `Sale.discount` includes promotion
savings; `netAmount` and `profit` reflect the amount charged. Bill discounts do not
stack with promotions. Refunds use saved effective item prices, not current offers.

After schema updates run `npm run prisma:generate` and restart the app. MongoDB
does not need a relational migration for these additive fields; `prisma db push`
can synchronize the new collection index in a planned deployment (do not use a reset).


ຖານຂໍ້ມູນຫຼັກແມ່ນ MongoDB ແລະ mapping ດ້ວຍ Prisma ໃນ `prisma/schema.prisma`

## products

ໃຊ້ເກັບສິນຄ້າ

- `name` ຊື່ສິນຄ້າ
- `sku` ລະຫັດສິນຄ້າ ບໍ່ຊໍ້າ
- `category` ໝວດໝູ່
- `costPrice` ຕົ້ນທຶນ ເກັບເປັນ `Int`
- `sellPrice` ລາຄາຂາຍ ເກັບເປັນ `Int`
- `stock` ຈໍານວນສະຕ໋ອກ
- `lowStockAlert` ຈໍານວນຂັ້ນຕໍ່າສໍາລັບແຈ້ງເຕືອນ
- `imageUrl` URL ຮູບສິນຄ້າ
- `isActive` ເປີດ ຫຼື ປິດການຂາຍ
- `variants` ຂະໜາດ ຫຼື ຮູບແບບຂາຍຂອງສິນຄ້າ
- `createdAt` ວັນທີສ້າງ
- `updatedAt` ວັນທີແກ້ໄຂຫຼ້າສຸດ

## orders

ໃຊ້ເກັບອໍເດີ

- `customerName`
- `phone`
- `province`
- `city`
- `shippingCompany`
- `pickupBranch` ສາຂາຮັບເຄື່ອງ
- `paymentStatus` ສະຖານະການຈ່າຍເງິນ: `PAID` ຫຼື `COD`
- `status`
- `items`
- `totalAmount`
- `totalCost`
- `profit`
- `note`
- `createdAt`
- `updatedAt`

## categories

ໃຊ້ເກັບໝວດໝູ່ສິນຄ້າທີ່ຜູ້ໃຊ້ເພີ່ມຈາກໜ້າ `Settings`

- `name` ຊື່ໝວດໝູ່ ແລະຕ້ອງບໍ່ຊໍ້າ
- `isActive` ໃຊ້ເປີດ/ປິດໝວດໝູ່ແທນການລຶບຖາວອນ
- `createdAt`
- `updatedAt`

## order items

ຝັງຢູ່ໃນ `orders.items` ເພື່ອເກັບ snapshot ຂອງສິນຄ້າຕອນຂາຍ

## sales

ໃຊ້ເກັບການຂາຍໜ້າຮ້ານຈາກໜ້າ POS ແຍກຈາກ `orders` ອອນລາຍ.

- `items` ລາຍການສິນຄ້າໃນບິນ
- `totalAmount` ຍອດກ່ອນຫຼຸດ
- `totalCost` ຕົ້ນທຶນລວມ
- `profit` ກໍາໄລຫຼັງຫັກສ່ວນຫຼຸດ
- `discount` ສ່ວນຫຼຸດ
- `netAmount` ຍອດສຸດທິ
- `paymentMethod` CASH, TRANSFER, OTHER
- `receivedAmount` ເງິນທີ່ຮັບ
- `changeAmount` ເງິນທອນ

- `productId`
- `variantId`
- `name`
- `variantName`
- `category`
- `sku`
- `quantity`
- `price`
- `cost`
- `imageUrl`

## product variants

ຝັງຢູ່ໃນ `products.variants`

- `id`
- `name` ຂະໜາດ ຫຼື ຮູບແບບຂາຍ ເຊັ່ນ `10ml`, `20ml`, `ຂວດເຕັມ`
- `sku`
- `unit`
- `costPrice`
- `sellPrice`
- `stock`
- `lowStockAlert`

ການຝັງຂໍ້ມູນນີ້ຊ່ວຍໃຫ້ປະຫວັດອໍເດີບໍ່ປ່ຽນຕາມການແກ້ໄຂລາຄາ ຫຼື ຕົ້ນທຶນສິນຄ້າໃນພາຍຫຼັງ

## ຂໍ້ມູນປະກອບ

- `daily_closings` ເກັບການປິດຍອດປະຈໍາວັນ
- `members` ແລະ `member_tiers` ເກັບສະມາຊິກ, ຍອດສະສົມ ແລະລະດັບສ່ວນຫຼຸດ
- `store_settings` ເກັບຂໍ້ມູນຮ້ານ, ຮູບແບບບິນ ແລະບໍລິສັດຂົນສົ່ງ
- ການສ້າງອໍເດີ/POS ກັບການຕັດສະຕ໋ອກ ແລະການຍົກເລີກກັບຄືນສະຕ໋ອກ ໃຊ້ MongoDB transaction
