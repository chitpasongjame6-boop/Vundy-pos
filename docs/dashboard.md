# Dashboard Module

ໄຟລ໌ຫຼັກ:

- `src/app/dashboard/page.tsx`
- `src/components/dashboard/stat-card.tsx`
- `src/components/dashboard/sales-profit-chart.tsx`
- `src/actions/dashboard.action.ts`

## ຂໍ້ມູນທີ່ສະແດງ

- ຍອດຂາຍມື້ນີ້
- ກໍາໄລມື້ນີ້
- ຈໍານວນອໍເດີມື້ນີ້
- dropdown `ປະເພດຍອດຂາຍ` ເລືອກໄດ້: `ທັງໝົດ`, `ອອນລາຍ`, `ຂາຍໜ້າຮ້ານ`
- ແຍກຍອດຂາຍມື້ນີ້: ອອນລາຍ, ຂາຍໜ້າຮ້ານ, ລວມທັງໝົດ
- ຍອດຂາຍເດືອນນີ້
- ກໍາໄລເດືອນນີ້
- ກຣາຟຍອດຂາຍ ແລະ ກໍາໄລລາຍວັນ
- ສິນຄ້າໃກ້ໝົດ
- ສິນຄ້າຂາຍດີ Top 5
- ອໍເດີຫຼ້າສຸດ

## ເງື່ອນໄຂຄໍານວນ

- ລາຍຮັບຫຼັກນັບຈາກ `SHIPPED`
- ຍອດຂາຍໜ້າຮ້ານ POS ນັບຈາກ `sales.netAmount`
- ກໍາໄລ POS ຄໍານວນຈາກ `netAmount - totalCost`
- ເມື່ອເລືອກ dropdown ໜ້າ Dashboard, card ຕົວເລກ, ກຣາຟ, Top 5 ແລະລາຍການຫຼ້າສຸດຈະດຶງສະເພາະ channel ທີ່ເລືອກ
- Top product ຝັ່ງອອນລາຍນັບສະເພາະ `SHIPPED`; `PENDING_PACK`, `PACKED`, `CANCELLED`, `RETURNED` ບໍ່ຖືກນັບເປັນຍອດຂາຍ
- ສິນຄ້າໃກ້ໝົດແມ່ນ `stock <= lowStockAlert`

## ວຽກຕໍ່

- ເພີ່ມຕົວກອງຊ່ວງວັນທີ
- ເພີ່ມຍອດຕາມບໍລິສັດຂົນສົ່ງ
- ເພີ່ມ export ລາຍງານເປັນ CSV ຫຼື Excel
