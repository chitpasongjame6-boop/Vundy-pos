# Login and User Roles

ระบบนี้เพิ่มการล็อกอินแบบง่ายด้วย cookie session เพื่อแยกสิทธิ์การใช้งานตามบทบาท

## บทบาท

- `OWNER` เจ้าของร้าน เห็นทุกเมนูและเข้าได้ทุกหน้า
- `STAFF` พนักงานขาย เห็นและเข้าได้เฉพาะ:
  - `/pos` ขายหน้าร้าน
  - `/pos/history` ประวัติบิล
  - `/pos/closing` ปิดยอด

ถ้าพนักงานพิมพ์ URL หน้าอื่นโดยตรง ระบบจะพากลับไปหน้า `/pos`

## บัญชีเริ่มต้น

ค่าตั้งต้นอยู่ใน `.env.example`

- เจ้าของร้าน: `owner` / `owner123`
- พนักงาน: `staff` / `staff123`

ถ้าต้องการเปลี่ยน ให้เพิ่มค่าใน `.env`:

```env
OWNER_USERNAME="owner"
OWNER_PASSWORD="owner123"
OWNER_NAME="ເຈົ້າຂອງຮ້ານ"
STAFF_USERNAME="staff"
STAFF_PASSWORD="staff123"
STAFF_NAME="ພະນັກງານຂາຍ"
```

## ไฟล์สำคัญ

- `src/app/login/page.tsx` หน้าเข้าสู่ระบบ
- `src/app/logout/route.ts` ออกจากระบบ
- `middleware.ts` กันหน้าและจำกัดสิทธิ์ตาม role
- `src/lib/auth.ts` ตรวจ username/password และอ่าน session
- `src/lib/auth-config.ts` กำหนด role, route ที่พนักงานเข้าได้ และ cookie session
- `src/components/layout/app-shell.tsx` ซ่อน/แสดงเมนูตาม role

## การบันทึกผู้ขาย

เมื่อสร้างบิลหน้าร้าน ระบบจะบันทึก `cashierId` และ `cashierName` ลงในข้อมูล `Sale` เพื่อให้ดูย้อนหลังได้ว่าใครเป็นคนขายหรือออกบิล

## หมายเหตุด้านความปลอดภัย

ระบบนี้เหมาะกับการใช้งานภายในร้านและเครื่องส่วนตัวก่อน ถ้าจะเปิดใช้งานผ่านอินเทอร์เน็ตจริง ควรเพิ่ม password hashing, user management ในฐานข้อมูล, และ session signing ที่แข็งแรงขึ้น

