# 🔧 AuthContext Migration Guide

## ✅ การเปลี่ยนแปลงที่เสร็จสิ้นแล้ว

### 1. **AuthContext อัปเดตแล้ว**

### 2. **ไฟล์ที่แก้ไขแล้ว:**

## 🎯 วิธีใช้งานใหม่

### **1. ใน React Components:**

```typescript
import { useAuth } from "@/contexts/AuthContext";

const MyComponent = () => {
  const { user, isAuthenticated, signIn, signOut } = useAuth();

  // ✅ ใช้ข้อมูลจาก user object
  const userId = user?.id;
  const userEmail = user?.email;
  const userRole = user?.role;

  // ✅ ตรวจสอบการ login
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <p>
        Hello {user.email} ({user.role})
      </p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
};
```

### **2. ในฟังก์ชัน API calls:**

```typescript
import { getAuthToken, getUserId, getUserEmail, getUserRole } from "@/lib/api";

// ✅ ใช้ utility functions สำหรับ non-React contexts
const makeAPICall = async () => {
  const token = getAuthToken();
  const userId = getUserId();

  return fetch("/api/some-endpoint", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-ID": userId,
    },
  });
};
```

### **3. Login กับ Remember Me:**

```typescript
const { signIn } = useAuth();

// ✅ Remember Me = true (default) → localStorage
await signIn(email, password, true);

// ✅ Remember Me = false → sessionStorage
await signIn(email, password, false);
```

### **4. อัปเดตข้อมูล User:**

```typescript
const { updateUser } = useAuth();

// ✅ อัปเดตข้อมูลบางส่วน
updateUser({
  name: "New Name",
  email: "new@email.com",
});
```

## ❌ สิ่งที่ไม่ควรทำอีกต่อไป

```typescript
// ❌ อย่าใช้แล้ว - เข้าถึง storage โดยตรง
const userId = localStorage.getItem("userId");
const userRole = sessionStorage.getItem("userRole");

// ✅ ใช้แทน
const { user } = useAuth();
const userId = user?.id;
const userRole = user?.role;
```

## ประโยชน์ที่ได้รับ

1. **✅ Centralized Management** - ข้อมูล auth อยู่ที่เดียว
2. **✅ Type Safety** - TypeScript รู้ว่าข้อมูลเป็นอะไร
3. **✅ Auto Sync** - เปลี่ยนที่ไหนก็อัปเดตทุกที่
4. **✅ Consistent Storage** - localStorage/sessionStorage แบบสม่ำเสมอ
5. **✅ Better UX** - Remember Me ทำงานได้ถูกต้อง
6. **✅ Easier Maintenance** - แก้ไขการจัดเก็บได้ง่าย

## 🔧 การ Debug

```typescript
const { user, isAuthenticated, getStoredValue } = useAuth();

console.log("User:", user);
console.log("Authenticated:", isAuthenticated);
console.log("Stored Token:", getStoredValue("token"));
console.log("Stored Role:", getStoredValue("userRole"));
```

## 📋 TODO หากต้องการพัฒนาต่อ

**✨ Migration เสร็จสมบูรณ์แล้ว! ตอนนี้ทุกการเข้าถึงข้อมูล authentication จะผ่าน AuthContext เท่านั้น**
