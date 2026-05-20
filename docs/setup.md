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
npm run dev
```

## Environment

ສ້າງໄຟລ໌ `.env` ທີ່ root ແລ້ວໃສ່ MongoDB connection string:

```env
DATABASE_URL="mongodb+srv://USER:PASSWORD@HOST/DATABASE?retryWrites=true&w=majority"
```

ຖ້າຍັງບໍ່ມີ `DATABASE_URL` ລະບົບຈະສ້າງ local dev storage ທີ່ `.local-data/stock-order-store.json`
ໂດຍເລີ່ມຈາກ mock data ໃນ `src/lib/mock-data.ts`. ໂໝດນີ້ໃຊ້ທົດສອບປຸ່ມເພີ່ມສິນຄ້າ, ສ້າງອໍເດີ, ແກ້ໄຂ, ປ່ຽນສະຖານະ, ເພີ່ມສະຕ໋ອກ, ແລະລຶບໄດ້ກ່ອນຕໍ່ MongoDB.
ຖ້າຕ້ອງການ reset ຂໍ້ມູນທົດສອບ ໃຫ້ປິດ dev server ແລ້ວລຶບໂຟນເດີ `.local-data`.

## Node Version

ເຄື່ອງທີ່ສ້າງໂປຣເຈັກໃຊ້ Node `20.11.0` ຈຶ່ງລັອກ Prisma ເປັນ `6.19.0` ເພາະ Prisma 7 ຕ້ອງໃຊ້ Node `20.19+`
