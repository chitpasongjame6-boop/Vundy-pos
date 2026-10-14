# Setup

ເອກະສານນີ້ອະທິບາຍວິທີຕັ້ງຄ່າ ແລະ ຣັນໂປຣເຈັກ Stock & Order Management System

## Stack

- Next.js + TypeScript
- MongoDB
- Prisma
- Tailwind CSS
- shadcn/ui style local components
- Recharts
- Noto Sans Lao

## Commands

```bash
npm install
npm run prisma:generate
npx prisma db push
npm run dev
```

## Environment

ສ້າງໄຟລ໌ `.env` ທີ່ root ແລ້ວໃສ່ MongoDB connection string:

```env
DATABASE_URL="mongodb+srv://USER:PASSWORD@HOST/DATABASE?retryWrites=true&w=majority"
SESSION_SECRET="replace-with-at-least-32-random-characters"
```

ຖ້າຍັງບໍ່ມີ `DATABASE_URL` ລະບົບຈະສ້າງ local dev storage ທີ່ `.local-data/stock-order-store.json`
ໂດຍເລີ່ມຈາກ mock data ໃນ `src/lib/mock-data.ts`. ໂໝດນີ້ໃຊ້ທົດສອບປຸ່ມເພີ່ມສິນຄ້າ, ສ້າງອໍເດີ, ແກ້ໄຂ, ປ່ຽນສະຖານະ, ເພີ່ມສະຕ໋ອກ, ແລະລຶບໄດ້ກ່ອນຕໍ່ MongoDB.
ຖ້າຕ້ອງການ reset ຂໍ້ມູນທົດສອບ ໃຫ້ປິດ dev server ແລ້ວລຶບໂຟນເດີ `.local-data`.

## Cloudflare R2 Images

ລະບົບ upload ຮູບສິນຄ້າ ແລະ logo ໃຊ້ Cloudflare R2. ໃຫ້ສ້າງ R2 API token ທີ່ມີສິດ Object Read & Write ແລ້ວຕັ້ງຄ່າ:

```env
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_BUCKET_NAME="your-r2-bucket-name"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_PUBLIC_URL="https://images.example.com"
```

`R2_PUBLIC_URL` ຕ້ອງເປັນ custom domain ທີ່ຜູກກັບ bucket (ແນະນຳສຳລັບ production) ຫຼື public `r2.dev` URL. ຢ່າໃຊ້ API endpoint `r2.cloudflarestorage.com` ເປັນ Public URL.

## Node Version

ໂປຣເຈັກຕ້ອງໃຊ້ Node `22.13.0` ຫຼືໃໝ່ກວ່າ. ກ່ອນ deploy ໃຫ້ຣັນ `npm run lint`, `npm run typecheck`, `npm test`, ແລະ `npm run build`.
