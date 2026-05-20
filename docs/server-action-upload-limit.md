# Server Action Upload Limit

ໜ້າ `/products/new` ໃຊ້ Server Action ສໍາລັບສ້າງສິນຄ້າ ແລະອັບໂຫຼດຮູບ.

## ປັນຫາ

ຖ້າຮູບສິນຄ້າໃຫຍ່ກວ່າ limit ຂອງ Server Action, browser ອາດສະແດງ error:

`An unexpected response was received from the server.`

## ການແກ້

- ຕັ້ງ `experimental.serverActions.bodySizeLimit` ໃນ `next.config.ts` ເປັນ `8mb`.
- ເມື່ອແກ້ `next.config.ts` ແລ້ວ ຕ້ອງ restart dev server ໃໝ່.

## ໄຟລ໌ທີ່ແກ້

- `next.config.ts`
- `src/actions/product.action.ts`
