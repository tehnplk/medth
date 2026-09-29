# medth — Project Instructions

## CodeBase Creating and Editing
- Set up Teminal Output console encoding to UTF-8  before runing task
 command.
## Stack
- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: MariaDB, database name = `medth`, ใช้ `mariadb` CLI
  - local: MariaDB 10.6 ใน Docker container ชื่อ `mariadb`
  - prod: MariaDB 11.8.6 ใน container `medth-db` (compose, `127.0.0.1:3309`) — container `mariadb` (3306) เป็นของเก่า ไม่ใช่ของ project นี้แล้ว
- **Runtime**: Bun / Node.js
- **Deploy**: Docker Compose (`compose.yaml`: `medth-app` + `medth-db`) on remote SSH server

---

## Testing

- ทุกไฟล์ที่สร้างเพื่อ test หรือ output จากการ test **ต้องเก็บใน `/tests` เสมอ** ห้ามวางไว้ที่อื่น
- การทดสอบ UI/web ในโปรเจกต์นี้ให้ใช้ **`playwright-cli` skill** เท่านั้น (เปิดเบราว์เซอร์จริง ทดสอบ flow จริง)
- ไม่ต้องปิด playwright browser session หลังทำงานเสร็จ
- บันทึก screenshot ไปที่ `.playwright-cli/` เสมอ (gitignored)

## Ask to Anotate the UI
- check  dev server on port 3001  if not avalible must run `bun dev` first
- run command for open browser session
    ```
    - playwright-cli open http://localhost/example
    - playwright-cli show --annotate
    ```
- run command for user's viewer
    ```
    - playwright-cli show
    ```

- Then wait user send you the anotatation result and edit code follow user request.

- If stuck user login  , use  admin / 1234

## Database
- use `db-cli --skill` for query data
- read database credentail fron @.env*
- restore dump จาก prod ลง local: ต้องแทน collation `utf8mb4_uca1400_ai_ci` (มีเฉพาะ 11.x) เป็น `utf8mb4_unicode_ci` ก่อน import และ backup `medth` ของ local ก่อนทุกครั้ง เก็บ dump ไว้ใน `backups/` (gitignored)

## Deployment to Host

- **ห้าม deploy โดยไม่ได้รับคำสั่งแยกต่างหาก** ไม่ว่าจะหลัง push หรือหลังงานเสร็จ
- รอคำสั่ง deploy จากผู้ใช้เท่านั้น และอ่าน @deploy-doc/production-host.md
- production: build image ที่ local → `docker save` → pscp → `docker load` บน prod → `docker compose up -d` (ห้าม `--build` บน prod) ขั้นตอนเต็มอยู่ใน deploy-doc

## General

- ไม่ต้องเพิ่ม comment อธิบาย code ที่ชื่อตัวแปร/ฟังก์ชันบอกอยู่แล้ว
- ไม่ต้องเพิ่ม feature, refactor, หรือ abstraction เกินกว่าที่งานต้องการ
- ไม่ต้องเพิ่ม error handling สำหรับ scenario ที่เป็นไปไม่ได้
