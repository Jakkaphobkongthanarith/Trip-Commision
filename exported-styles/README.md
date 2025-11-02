# Travel Package Design System - CSS Files

ไฟล์ CSS เหล่านี้ถูกสร้างจากโปรเจกต์ Travel Package (React + Vite + Tailwind) เพื่อให้สามารถนำไปใช้กับโปรเจกต์อื่นๆ ได้ เช่น Next.js, React, หรือแม้กระทั่ง HTML/CSS ธรรมดา

## 📁 ไฟล์ที่รวมอยู่

### 1. `design-system.css`
**ไฟล์หลักที่มี Design Tokens และ Utility Classes**

ประกอบด้วย:
- CSS Variables (HSL Color System) สำหรับ Light/Dark Mode
- Utility Classes พื้นฐาน (backgrounds, text, borders, shadows)
- Component Base Styles (cards, buttons, badges)
- Animation Classes
- Responsive Utilities
- Accessibility Helpers

**การใช้งาน:**
```html
<link rel="stylesheet" href="design-system.css">

<!-- ใช้ classes -->
<div class="card shadow-card-hover">
  <h2 class="text-gradient-sunset">Beautiful Title</h2>
  <button class="btn btn-primary">Click Me</button>
</div>
```

### 2. `components.css`
**สไตล์สำหรับ Components เฉพาะของโปรเจกต์**

ประกอบด้วย:
- Travel Package Card Styles
- Hero Section
- Navbar
- Search Bar
- Tag Filter
- Notification Components
- Loading States (Skeleton)
- Toast/Alert
- Form Elements
- Modal/Dialog
- Grid Layouts

**การใช้งาน:**
```html
<link rel="stylesheet" href="design-system.css">
<link rel="stylesheet" href="components.css">

<!-- ใช้ component styles -->
<div class="travel-package-card">
  <img src="..." class="travel-package-card-image">
  <h3 class="travel-package-card-title">Package Title</h3>
  <p class="travel-package-card-description">Description...</p>
  <div class="travel-package-card-price">฿5,000</div>
</div>
```

### 3. `react-image-crop.css`
**สไตล์สำหรับ React Image Crop Library**

ใช้กับ `react-image-crop` package สำหรับการครอปรูปภาพ

## 🎨 Color System

โปรเจกต์ใช้ HSL Color System ทั้งหมด เพื่อรองรับ Light/Dark Mode:

### Light Mode Colors
```css
--primary: 210 85% 55%        /* Sky Blue */
--secondary: 30 85% 65%       /* Warm Orange */
--accent: 140 50% 60%         /* Nature Green */
--background: 215 30% 98%     /* Light Background */
--foreground: 220 15% 15%     /* Dark Text */
```

### Dark Mode Colors
```css
--primary: 210 40% 98%        /* Light Blue */
--secondary: 217.2 32.6% 17.5% /* Dark Orange */
--accent: 217.2 32.6% 17.5%   /* Dark Green */
--background: 222.2 84% 4.9%  /* Dark Background */
--foreground: 210 40% 98%     /* Light Text */
```

## 🚀 การนำไปใช้กับโปรเจกต์อื่น

### สำหรับ Next.js

#### 1. วิธีที่ 1: ใช้ CSS Modules
```typescript
// app/globals.css
@import './exported-styles/design-system.css';
@import './exported-styles/components.css';

// app/layout.tsx
import './globals.css'
```

#### 2. วิธีที่ 2: ใช้ใน _app.tsx (Pages Router)
```typescript
// pages/_app.tsx
import '../styles/design-system.css'
import '../styles/components.css'

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
```

#### 3. วิธีที่ 3: ใช้ใน app/layout.tsx (App Router)
```typescript
// app/layout.tsx
import './design-system.css'
import './components.css'

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
```

### สำหรับ React (Vite/CRA)

```typescript
// main.tsx หรือ index.tsx
import './styles/design-system.css'
import './styles/components.css'
import './App'
```

### สำหรับ HTML ธรรมดา

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <link rel="stylesheet" href="design-system.css">
  <link rel="stylesheet" href="components.css">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

## 🎯 ตัวอย่างการใช้งาน

### 1. Travel Package Card
```html
<div class="travel-package-card">
  <div style="position: relative;">
    <img src="package.jpg" class="travel-package-card-image" alt="Package">
    <div class="travel-package-card-discount">ลด 20%</div>
  </div>
  <div style="padding: 1rem;">
    <h3 class="travel-package-card-title">เที่ยวภูเก็ต 3 วัน 2 คืน</h3>
    <p class="travel-package-card-description">
      พักผ่อนริมหาด ดำน้ำชมปะการัง
    </p>
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span class="travel-package-card-price">฿8,000</span>
      <span class="travel-package-card-original-price">฿10,000</span>
    </div>
    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
      ดูรายละเอียด
    </button>
  </div>
</div>
```

### 2. Hero Section
```html
<div class="hero-section">
  <h1 class="hero-title">ค้นหาทริปในฝัน</h1>
  <p class="hero-subtitle">
    แพ็กเกจท่องเที่ยวราคาพิเศษ พร้อมบริการครบครัน
  </p>
</div>
```

### 3. Search Bar
```html
<div class="search-bar">
  <span class="search-icon">🔍</span>
  <input 
    type="text" 
    class="search-input" 
    placeholder="ค้นหาแพ็กเกจท่องเที่ยว..."
  >
</div>
```

### 4. Grid Layout
```html
<div class="package-grid">
  <div class="travel-package-card">...</div>
  <div class="travel-package-card">...</div>
  <div class="travel-package-card">...</div>
</div>
```

## 🌓 Dark Mode

เปิดใช้งาน Dark Mode โดยเพิ่ม class `dark` ที่ root element:

```html
<!-- Light Mode -->
<html lang="th">
  <body>...</body>
</html>

<!-- Dark Mode -->
<html lang="th" class="dark">
  <body>...</body>
</html>
```

### JavaScript สำหรับสลับ Dark Mode
```javascript
// Toggle Dark Mode
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  
  // บันทึกค่าใน localStorage
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// โหลดค่าจาก localStorage
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
});
```

### React Hook สำหรับ Dark Mode
```typescript
import { useEffect, useState } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setIsDark(savedTheme === 'dark');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return { isDark, toggleDarkMode };
}
```

## 🎨 การปรับแต่ง Colors

หากต้องการปรับเปลี่ยนสี เพียงแก้ไข CSS Variables ใน `design-system.css`:

```css
:root {
  /* เปลี่ยนสีหลัก */
  --primary: 210 85% 55%;  /* แก้เป็นสีที่ต้องการ (HSL) */
  --secondary: 30 85% 65%; /* แก้เป็นสีที่ต้องการ (HSL) */
  
  /* เปลี่ยน Gradient */
  --sunset-gradient: linear-gradient(135deg, 
    hsl(30 85% 65%), 
    hsl(210 85% 55%)
  );
}
```

## 📱 Responsive Design

ระบบมี breakpoints ดังนี้:
- **Mobile**: < 640px
- **Tablet**: 640px - 768px
- **Desktop**: > 768px

ตัวอย่าง Media Queries:
```css
/* Mobile First */
.element {
  font-size: 1rem;
}

/* Tablet */
@media (min-width: 640px) {
  .element {
    font-size: 1.125rem;
  }
}

/* Desktop */
@media (min-width: 768px) {
  .element {
    font-size: 1.25rem;
  }
}
```

## ✨ Animations

ระบบมี Animation Classes พร้อมใช้:

```html
<!-- Smooth Transition -->
<div class="transition-smooth">Content</div>

<!-- Hover Scale -->
<button class="btn btn-primary hover-scale">Hover Me</button>

<!-- Hover Lift -->
<div class="card hover-lift">Card</div>

<!-- Loading Skeleton -->
<div class="skeleton" style="height: 100px;"></div>
```

## 🔧 การใช้งานกับ Tailwind CSS

หากต้องการใช้ร่วมกับ Tailwind CSS:

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        // ... เพิ่มสีอื่นๆ
      }
    }
  }
}
```

## 📝 หมายเหตุ

- ไฟล์ CSS เหล่านี้ใช้ HSL Color System เท่านั้น
- รองรับ Light/Dark Mode อัตโนมัติ
- ไม่จำเป็นต้องใช้ Tailwind CSS (แต่สามารถใช้ร่วมกันได้)
- เหมาะสำหรับโปรเจกต์ Travel/Tourism
- คุณสามารถแก้ไขและปรับแต่งได้ตามต้องการ

## 🎯 สิ่งที่ควรทำต่อ

1. ปรับแต่งสีให้เข้ากับแบรนด์ของคุณ
2. เพิ่ม Components เพิ่มเติมตามความต้องการ
3. ปรับ Spacing และ Typography ให้เหมาะสม
4. เพิ่ม Animation/Transition เพิ่มเติม
5. ทดสอบ Accessibility (ARIA labels, contrast ratio, etc.)

## 📞 Support

หากมีปัญหาหรือข้อสงสัย สามารถศึกษาเพิ่มเติมได้จาก:
- [MDN Web Docs - CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [HSL Colors](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
