# Bill Sizes

ເພີ່ມການຕັ້ງຄ່າຂະໜາດບິນໃນໜ້າ `/settings`.

## ຕົວເລືອກ

- ບິນຂົນສົ່ງ: `100 x 150 mm` ຫຼື `A4`.
- ບິນ POS: `80 mm` ຫຼື `58 mm`.

## ການເຮັດວຽກ

- ຄ່າຖືກເກັບໃນ `storeSettings.orderBillSize` ແລະ `storeSettings.posReceiptSize`.
- ບິນຂົນສົ່ງອ່ານຄ່າຈາກ `src/components/orders/order-list.tsx`.
- ບິນ POS ອ່ານຄ່າຈາກ `src/components/pos/pos-terminal.tsx` ແລະ `src/components/pos/pos-receipt-printer.ts`.

## ໄຟລ໌ຫຼັກ

- `src/types/index.ts`
- `src/lib/local-store.ts`
- `src/actions/settings.action.ts`
- `src/app/settings/page.tsx`
- `src/components/orders/order-list.tsx`
- `src/components/pos/pos-terminal.tsx`
- `src/components/pos/pos-receipt-printer.ts`
