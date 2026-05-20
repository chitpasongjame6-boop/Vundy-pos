# ໂປຣເຈັກ: Stock & Order Management System

ລະບົບຈັດການສະຕ໋ອກ ແລະ ອໍເດີ ສໍາລັບ VL

## Stack

- Framework: Next.js + TypeScript
- Database: MongoDB
- ORM: Prisma
- UI: Tailwind CSS, shadcn/ui style components, Recharts
- Font: Noto Sans Lao ທັງລະບົບ

## ເມນູຫຼັກ

1. ໜ້າລວມ
2. ສິນຄ້າ
3. ເພີ່ມສິນຄ້າ
4. ອໍເດີ
5. ປະຫວັດອໍເດີ
6. ລາຍງານກໍາໄລ
7. ຕັ້ງຄ່າ

## Collections

### products

ເກັບຂໍ້ມູນສິນຄ້າ:

- `id`
- `name` ຊື່ສິນຄ້າ
- `sku` ລະຫັດສິນຄ້າ
- `category` ໝວດໝູ່
- `costPrice` ຕົ້ນທຶນ
- `sellPrice` ລາຄາຂາຍ
- `stock` ຈໍານວນສະຕ໋ອກ
- `lowStockAlert` ຈໍານວນສໍາລັບແຈ້ງເຕືອນສະຕ໋ອກໃກ້ໝົດ
- `imageUrl` ຮູບສິນຄ້າ
- `isActive` ເປີດ ຫຼື ປິດການຂາຍ
- `variants` ຂະໜາດ ຫຼື ຮູບແບບຂາຍຂອງສິນຄ້າ
- `createdAt`
- `updatedAt`

### orders

ເກັບຂໍ້ມູນອໍເດີ:

- `id`
- `customerName` ຊື່ລູກຄ້າ
- `phone` ເບີໂທ
- `province` ແຂວງ
- `city` ເມືອງ
- `shippingCompany` ບໍລິສັດຂົນສົ່ງ
- `pickupBranch` ສາຂາຮັບເຄື່ອງ
- `paymentStatus` ການຊໍາລະ: `PAID` ຫຼື `COD`
- `status` ສະຖານະອໍເດີ
- `items` ລາຍການສິນຄ້າ
- `totalAmount` ຍອດຂາຍລວມ
- `totalCost` ຕົ້ນທຶນລວມ
- `profit` ກໍາໄລລວມ
- `note` ໝາຍເຫດ
- `createdAt`
- `updatedAt`

### order items

ຢູ່ຂ້າງໃນ `orders.items` ເພື່ອເກັບ snapshot ຂອງສິນຄ້າຕອນສ້າງອໍເດີ:

- `productId`
- `name`
- `category`
- `sku`
- `quantity`
- `price`
- `cost`
- `imageUrl`

## ສະຖານະອໍເດີ

- `PENDING_PACK` = ລໍຖ້າແພັກ, ສີເຫຼືອງ
- `PACKED` = ແພັກແລ້ວ, ສີຟ້າ
- `SHIPPED` = ສົ່ງແລ້ວ, ສີຂຽວ
- `CANCELLED` = ຍົກເລີກ, ສີເທົາ
- `RETURNED` = ຕີກັບ, ສີແດງ

## Dashboard

ສະແດງ:

- ຍອດຂາຍມື້ນີ້
- ກໍາໄລມື້ນີ້
- ຈໍານວນອໍເດີມື້ນີ້
- ຍອດຂາຍເດືອນນີ້
- ກໍາໄລເດືອນນີ້
- ກຣາຟຍອດຂາຍລາຍວັນ
- ກຣາຟກໍາໄລລາຍວັນ
- ສິນຄ້າໃກ້ໝົດ
- ສິນຄ້າຂາຍດີ Top 5
- ອໍເດີຫຼ້າສຸດ

ເງື່ອນໄຂ:

- ບໍ່ນັບ `CANCELLED`
- ບໍ່ນັບ `RETURNED`
- ຍອດຂາຍຫຼັກນັບຈາກ `SHIPPED`

## ໜ້າສິນຄ້າ

ຟີເຈີ:

- ເພີ່ມສິນຄ້າ
- ເພີ່ມຫຼາຍຂະໜາດ/variant ໃນສິນຄ້າດຽວ
- ແກ້ໄຂສິນຄ້າ
- ລຶບ ຫຼື ປິດການຂາຍ
- ເພີ່ມສະຕ໋ອກ
- ຄົ້ນຫາສິນຄ້າ
- ກອງຕາມໝວດໝູ່
- ອັບໂຫຼດຮູບສິນຄ້າຈາກເຄື່ອງ ແທນການກອກ URL

ການສະແດງຜົນ:

- Mobile = 2 ຄໍລໍາ
- Desktop = 3 ຄໍລໍາ

## ໜ້າອໍເດີ

ຕອນສ້າງອໍເດີ:

1. ກວດວ່າສະຕ໋ອກພໍບໍ
2. ບັນທຶກອໍເດີ
3. ຕັດສະຕ໋ອກ
4. ຄໍານວນຍອດຂາຍ
5. ຄໍານວນຕົ້ນທຶນ
6. ຄໍານວນກໍາໄລ
7. ຕັ້ງສະຖານະເປັນ `PENDING_PACK`

ການຊໍາລະ:

- `PAID` = ຈ່າຍແລ້ວ
- `COD` = ເກັບເງິນປາຍທາງ
- ໃບປິ້ນບິນຈະສະແດງຍອດ COD ສະເພາະອໍເດີທີ່ເລືອກ `COD`

ບໍລິສັດຂົນສົ່ງ:

- ຮຸ່ງອາລຸນ
- ອານຸສິດ
- ມີໄຊ
- Unitel

## ສູດຄໍານວນ

```text
ຍອດຂາຍ = ລາຄາຂາຍ x ຈໍານວນ
ຕົ້ນທຶນ = ຕົ້ນທຶນສິນຄ້າ x ຈໍານວນ
ກໍາໄລ = ຍອດຂາຍ - ຕົ້ນທຶນ
```

ຕົວຢ່າງ:

```text
ລາຄາຂາຍ 150,000
ຕົ້ນທຶນ 90,000
ຈໍານວນ 2

ຍອດຂາຍ = 300,000
ຕົ້ນທຶນ = 180,000
ກໍາໄລ = 120,000
```

## Folder Structure

```text
src/
  app/
    dashboard/
    products/
    products/new/
    orders/
    orders/new/
    orders/history/
    reports/
    settings/
  components/
    dashboard/
    products/
    orders/
    layout/
    ui/
  actions/
    product.action.ts
    order.action.ts
    dashboard.action.ts
  lib/
    prisma.ts
    utils.ts
  types/
    index.ts

prisma/
  schema.prisma
```

## Mobile First Design

Mobile:

- ໃຊ້ card ແທນ table
- ປຸ່ມໃຫຍ່ ກົດງ່າຍ
- ເມນູຢູ່ດ້ານລຸ່ມ
- ສີສະຖານະຊັດເຈນ

Desktop:

- ໃຊ້ sidebar
- Dashboard ສະແດງຫຼາຍ card ຕໍ່ແຖວ
- ກຣາຟໃຫຍ່ຂຶ້ນ
