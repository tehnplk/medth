# medth — Project Instructions

## CodeBase Creating and Editing
- Set up Teminal Output console encoding to UTF-8  before runing task
 command.
## Stack
- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: MariaDB 11 — รันใน Docker container ชื่อ `mariadb`, database name = `medth`, ใช้ `mariadb` CLI
- **Runtime**: Bun / Node.js
- **Deploy**: PM2 (`medth-app`) on remote SSH server

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

## Deployment to Host

- **ห้าม deploy โดยไม่ได้รับคำสั่งแยกต่างหาก** ไม่ว่าจะหลัง push หรือหลังงานเสร็จ
- รอคำสั่ง deploy จากผู้ใช้เท่านั้น และอ่าน @deploy-doc/production-host.md
- production install/build ให้ใช้ Bun: `bun ci`, `bun run build`, แล้ว `pm2 restart medth-app`
- หลีกเลี่ยง `npm install` บน production เพราะอาจพลาด Linux native optional packages ที่ Tailwind/Lightning CSS ต้องใช้

## General

- ไม่ต้องเพิ่ม comment อธิบาย code ที่ชื่อตัวแปร/ฟังก์ชันบอกอยู่แล้ว
- ไม่ต้องเพิ่ม feature, refactor, หรือ abstraction เกินกว่าที่งานต้องการ
- ไม่ต้องเพิ่ม error handling สำหรับ scenario ที่เป็นไปไม่ได้
