# Setup

## ติดตั้งบน Linux Mint พร้อม MongoDB ในเครื่อง

ใช้ Linux Mint 21/22 (ฐาน Ubuntu 22.04/24.04), CPU 64-bit ที่ MongoDB รองรับ (x86 ต้องมี AVX), แนะนำ RAM 4 GB ขึ้นไป และพื้นที่ว่าง 10 GB ขึ้นไปสำหรับ build/images/data
ต้องใช้อินเทอร์เน็ตตอนติดตั้งครั้งแรกและอัปเดต แต่ฐานข้อมูลหลังติดตั้งจะอยู่ในเครื่อง ไม่ใช้ Atlas

คัดลอกโปรเจ็กต์ **ฉบับที่มี `run.sh`, `Dockerfile`, `compose.local.yml` และโฟลเดอร์ `scripts/linux`** ลงบนดิสก์ Linux แล้วเปิด Terminal ในโฟลเดอร์นั้น:

```bash
bash run.sh
```

ลำดับการทำงาน: `apt-get update` → ติดตั้ง Docker Engine/Compose เมื่อยังไม่มี → เตรียม Node.js 22 ใน image → `npm ci` → สร้าง Prisma Client → `npm run build -- --webpack` → เตรียม MongoDB Replica Set → ตรวจ schema/indexes → `npm start`
ไม่ต้องติดตั้ง Node.js/npm/MongoDB บน host แยกเอง และไม่ต้องรันสคริปต์ด้วย `sudo` (สคริปต์จะขอสิทธิ์เมื่อต้องใช้)
ไม่มีการ `apt upgrade` ทั้งระบบ, รีบูต, ลบแพ็กเกจที่ชนกัน หรือ reset ฐานข้อมูลโดยอัตโนมัติ

เมื่อสำเร็จเปิด **http://localhost:3000** ใช้ชื่อผู้ใช้ `owner` หรือ `staff` รหัสผ่านและ PIN ที่สุ่มให้ดูได้ในไฟล์ `.env.linux.local`:

```bash
nano .env.linux.local
```

- เว็บและ MongoDB ใช้ `restart: unless-stopped` จึงเริ่มอีกครั้งหลังเปิดเครื่อง หากไม่ได้สั่ง stop ไว้
- MongoDB มีรหัสผ่าน บัญชีเว็บมีสิทธิ์เฉพาะฐาน `vundy_pos` และใช้ replica set ชื่อ `rs0` สำหรับ transactions
- ไม่เปิดพอร์ต MongoDB บน host; ข้อมูลอยู่ใน Docker volume `vundy-local_mongo-data` และยังอยู่หลังลบ/สร้าง container ใหม่
- `.env`/`.env.local` เดิมของโปรเจ็กต์ รวมถึงข้อมูล Atlas ไม่ถูกอ่านเข้าชุดติดตั้งหรือแก้ไข ไฟล์ตั้งค่าชุดนี้คือ `.env.linux.local` เท่านั้น
- ห้ามเปลี่ยน/ลบรหัส `MONGO_*` หรือ keyfile เองหลังมีข้อมูลแล้ว ต้องเปลี่ยนรหัสในฐานข้อมูลควบคู่กัน
- ติดตั้งซ้ำด้วย `bash run.sh` ได้ โดยเก็บรหัสเดิมและข้อมูลไว้ ไม่ใช้ตัวเลือกยอมให้ schema สูญเสียข้อมูล
- การรันซ้ำจะ build โค้ดในโฟลเดอร์ปัจจุบัน ไม่ได้ `git pull` เอง ควรสำรองข้อมูลก่อนอัปเดตโค้ด
- ยังไม่ได้ทดสอบติดตั้งเต็มรูปแบบบน Linux Mint จริงในเครื่องพัฒนาที่เป็น Windows

### เปิดให้เครื่องอื่นในร้าน

```bash
bash run.sh --lan
# เปลี่ยนพอร์ตเมื่อ 3000 ถูกใช้งานอยู่
bash run.sh --lan --port 3001
# กลับมาให้เฉพาะเครื่องนี้เข้าได้
bash run.sh --localhost
```

เครื่องอื่นเปิด `http://IP-เครื่อง-Mint:3000` (หรือพอร์ตที่เลือก) ต้องเปิดเครื่อง Mint ไว้
LAN แบบนี้เป็น HTTP ไม่เข้ารหัส: ใช้เฉพาะเครือข่ายร้านที่เชื่อถือได้ ห้าม forward port ออกอินเทอร์เน็ต
Docker published ports อาจข้ามกฎ UFW ได้; ตัวติดตั้งจึงผูกกับ `127.0.0.1` เป็นค่าเริ่มต้น และไม่แก้ firewall ให้เอง
การทดสอบ Web Serial/PWA บางอย่างอาจต้อง HTTPS หรือ localhost; การพิมพ์ผ่านหน้าต่าง Browser ยังใช้ได้
ค่าผ่อนผัน cookie `VUNDY_LOCAL_HTTP=1` อยู่เฉพาะ Compose ชุดนี้ ค่าเริ่มต้น production ทั่วไปยังคง HTTPS-only

### ย้ายข้อมูลเดิมและรูปภาพ

ฐานข้อมูลในเครื่องเริ่มว่าง ไม่ได้ดึงข้อมูลจาก Atlas อัตโนมัติ
หากต้องการย้าย ให้เจ้าของร้านดาวน์โหลด Backup จากหน้า Settings ของระบบเดิม เก็บไฟล์สำรองไว้อีกที่หนึ่ง แล้วเลือก Restore ในระบบ local ใหม่
Restore จะแทนที่ข้อมูลที่มีอยู่ในระบบปลายทาง ต้องตรวจว่าเข้าเว็บ local และสำรองข้อมูลปลายทางก่อนยืนยัน ไม่มีการลบข้อมูลใน Atlas

R2 เป็นคนละส่วนกับ MongoDB: รูปเดิมที่อ้าง URL ของ R2 ยังต้องใช้อินเทอร์เน็ต
ถ้า Restore ข้อมูลที่มีรูป R2 ให้ตั้ง `R2_PUBLIC_URL` ของระบบเดิมใน `.env.linux.local` แล้วรัน `bash run.sh` อีกครั้ง เพื่ออนุญาต hostname ของรูป ไม่จำเป็นต้องใส่ API keys หากต้องการให้รูปอัปโหลดใหม่เก็บในเครื่องต่อไป
ใน `.env.linux.local` ค่า R2 เริ่มต้นว่าง รูปอัปโหลดใหม่จึงใช้ inline fallback ของระบบ (หลังบีบอัด จำกัด 1.5 MB ต่อรูป) ซึ่งเก็บกับฐานข้อมูลในเครื่อง
หากยังต้องการ R2 ให้เติมค่าของคุณในไฟล์นี้แล้วรัน `bash run.sh` อีกครั้ง เพื่อ rebuild hostname สำหรับรูป อย่าใส่ key ลง Dockerfile หรือ Git

### ควบคุมและสำรองข้อมูล

รันจากโฟลเดอร์โปรเจ็กต์:

```bash
sudo docker compose --env-file .env.linux.local -f compose.local.yml ps
sudo docker compose --env-file .env.linux.local -f compose.local.yml logs --tail=100 app mongo
sudo docker compose --env-file .env.linux.local -f compose.local.yml stop
sudo docker compose --env-file .env.linux.local -f compose.local.yml start mongo app
```

สำรองข้อมูลผ่าน Settings เป็นประจำไปยังอีกเครื่อง/ดิสก์ และเก็บ `.env.linux.local` กับ `.local-data/linux/mongo-keyfile` ไว้อย่างปลอดภัย
อย่าใช้ `docker compose down -v`, ลบ volume หรือ `docker volume prune` กับข้อมูลร้าน การ restart ไม่ใช่การสำรองข้อมูล
อย่าคัดลอกโฟลเดอร์ data ของ MongoDB ขณะฐานข้อมูลทำงาน ให้ใช้ Backup ของแอปหรือ `mongodump`
หากพบ volume เดิมแต่ไฟล์ credentials หาย สคริปต์จะหยุด ไม่สุ่มรหัสใหม่ทับข้อมูลเดิม

อ้างอิง: [Docker บน Ubuntu/Mint](https://docs.docker.com/engine/install/ubuntu/), [MongoDB replica set authentication](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/), [Prisma MongoDB](https://www.prisma.io/docs/orm/v6/overview/databases/mongodb)
Docker ระบุว่า Linux Mint เป็น Ubuntu derivative ที่ไม่รองรับอย่างเป็นทางการ; ตัวติดตั้งนี้ใช้ repository ตาม `UBUNTU_CODENAME` และหยุดบนรุ่นอื่น/LMDE

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
ຖ້າຕ້ອງການ reset ຂໍ້ມູນ mock ໃນໂໝດ dev ໃຫ້ປິດ dev server, ສຳຮອງຂໍ້ມູນ ແລ້ວລຶບສະເພາະ `.local-data/stock-order-store.json`. ຢ່າລຶບໂຟນເດີ `.local-data` ທັງໝົດ ເພາະມີ keyfile ຂອງ MongoDB ຊຸດ Linux ຢູ່ນຳ.

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
