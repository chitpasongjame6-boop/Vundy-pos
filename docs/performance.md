# Performance Notes

ການປັບຄວາມໄວຮອບນີ້ເນັ້ນຫຼຸດຈໍານວນຂໍ້ມູນທີ່ດຶງຈາກ MongoDB ແລະຫຼຸດການປະມວນຜົນໃນ memory.

ສິ່ງທີ່ປັບ:

- ເພີ່ມ index ໃນ `prisma/schema.prisma` ສໍາລັບ fields ທີ່ຄົ້ນຫາ/ຈັດລຽງບ່ອຍ: `createdAt`, `status`, `paymentMethod`, `category`, `updatedAt`, `phone`, `orderNo`, `saleNo`.
- `getOrders` ແລະ `getProducts` ຮອງຮັບ `limit` ເພື່ອບໍ່ດຶງລາຍການຈໍານວນຫຼາຍເກີນໄປໃນໜ້າທົ່ວໄປ.
- ໜ້າ `/orders`, `/orders/history`, `/products`, `/pos`, `/orders/new` ຈໍາກັດຈໍານວນລາຍການທີ່ໂຫຼດຄັ້ງທໍາອິດ.
- ໜ້າ `/pos/history` ດຶງຂໍ້ມູນຕາມ filter ຈາກ database ໂດຍກົງເມື່ອບໍ່ມີ search text ແລະຈໍາກັດການສະແດງ 100 ບິນ.
- ໜ້າ `/sold-products` ບໍ່ດຶງ products ທັງໝົດເພື່ອຫາຮູບອີກແລ້ວ; ຈະດຶງສະເພາະ product ids ທີ່ຂາດຮູບ.

ຫຼັງ deploy ໄປ production ຄວນ run:

```bash
npx prisma db push
```

ເພື່ອໃຫ້ MongoDB ສ້າງ indexes ຕາມ schema ໃໝ່.
