# ระบบ Notification สำหรับ Trip Trader

## ฟีเจอร์ที่เพิ่มใหม่

### 🔔 ระบบการแจ้งเตือนอัตโนมัติ

เมื่อ Manager สร้างโค้ดส่วนลด ระบบจะส่ง notification อัตโนมัติให้ผู้ที่เกี่ยวข้อง:

#### 1. **Advertiser Discount Codes**

- เมื่อสร้างโค้ดส่วนลดให้ Advertiser คนใดคนหนึ่ง
- จะส่ง notification ไปหา Advertiser คนนั้นโดยตรง
- ข้อความ: "คุณได้รับโค้ดส่วนลด X% ใหม่! โค้ด: ABC123"

#### 2. **Global Discount Codes**

- เมื่อสร้างโค้ดส่วนลดสำหรับผู้ใช้ทั่วไป
- จะส่ง notification ไปหาผู้ใช้ทุกคนในระบบ
- ข้อความ: "โค้ดส่วนลดใหม่! ลด X% สำหรับทุกแพ็กเกจ โค้ด: GLOBAL123"

### Backend API Endpoints

#### Notification Management

```
POST /api/notifications
- สร้าง notification สำหรับผู้ใช้คนเดียว
- Body: { user_id, message, type }

POST /api/notifications/broadcast
- ส่ง notification ให้ผู้ใช้ทั้งหมด
- Body: { message, type }

GET /api/notifications/user/:user_id
- ดึง notifications ของผู้ใช้

PUT /api/notifications/:id/read
- ทำเครื่องหมาย notification ว่าอ่านแล้ว

PUT /api/notifications/user/:user_id/read-all
- ทำเครื่องหมาย notifications ทั้งหมดว่าอ่านแล้ว

DELETE /api/notifications/:id
- ลบ notification

GET /api/notifications/user/:user_id/unread-count
- นับจำนวน notifications ที่ยังไม่ได้อ่าน
```

### 📱 Frontend Components

#### NotificationDropdown Component

- แสดงไอคอน bell ใน Navbar
- แสดง badge จำนวน notifications ที่ยังไม่ได้อ่าน
- Dropdown แสดงรายการ notifications
- ฟีเจอร์ mark as read, delete, mark all as read
- Auto-refresh ทุก 30 วินาที

### Database Schema

#### Notifications Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID (FK to auth.users),
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### Types

- `discount_code`: โค้ดส่วนลดสำหรับ advertiser
- `global_discount`: โค้ดส่วนลดสำหรับทุกคน
- `booking`: การจอง
- อื่นๆ ตามต้องการ

### การใช้งาน

#### สำหรับ Manager

1. เข้าหน้า Package Management
2. ไปที่แท็บ "Advertiser Discount Codes" หรือ "Global Discount Codes"
3. สร้างโค้ดส่วนลดใหม่
4. ระบบจะส่ง notification อัตโนมัติ

#### สำหรับผู้ใช้ทั่วไป/Advertiser

1. ดูไอคอน bell ใน Navbar
2. ถ้ามี badge แดง = มี notifications ใหม่
3. คลิกเพื่อดู notifications
4. คลิก "อ่าน" หรือ "อ่านทั้งหมด"
5. คลิก X เพื่อลบ notification

### 🔧 การติดตั้ง

#### Database Migration

1. รันไฟล์ `database/migrations/create_notifications_table.sql`
2. หรือให้ GORM AutoMigrate สร้างตารางอัตโนมัติ

#### Backend

- โมเดล `Notification` ถูกเพิ่มใน `models/notification.go`
- Controller `NotificationController` ใน `controllers/notification_controller.go`
- Routes เพิ่มใน `routes.go`

#### Frontend

- Component `NotificationDropdown` ใน `components/NotificationDropdown.tsx`
- เพิ่มใน `Navbar.tsx`
- ฟังก์ชันส่ง notification ใน `PackageManagement.tsx`

### การปรับแต่งเพิ่มเติม

#### เพิ่ม Notification Types

```go
// ใน models/notification.go
const (
    NotificationTypeDiscountCode = "discount_code"
    NotificationTypeGlobalDiscount = "global_discount"
    NotificationTypeBooking = "booking"
    NotificationTypePackageUpdate = "package_update"
)
```

#### Realtime Notifications (อนาคต)

- ใช้ WebSocket หรือ Server-Sent Events
- Push notifications สำหรับ mobile app
- Email notifications

### 🔒 Security

#### Row Level Security (RLS)

- ผู้ใช้ดูได้เฉพาะ notifications ของตัวเอง
- เฉพาะ service role ที่สร้าง notifications ได้
- CRUD operations มี policies ที่เหมาะสม

#### Authorization

- ตรวจสอบ user authentication
- Validate user permissions
- Sanitize input data
