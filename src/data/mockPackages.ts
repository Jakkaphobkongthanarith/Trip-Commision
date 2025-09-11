import ayutthayaImage from '@/assets/ayutthaya-package.jpg';
import beachImage from '@/assets/beach-package.jpg';
import marketImage from '@/assets/market-package.jpg';
import mountainImage from '@/assets/mountain-package.jpg';

export const mockPackages = [
  {
    id: "1",
    title: "7 วัด 3 วัน 2 คืน อยุธยา มรดกโลกแห่งอดีต",
    description: "สัมผัสความงามของอารยธรรมไทยโบราณ เยื่อนชมปราสาทเก่าแก่และวัดสำคัญ 7 แห่งในอยุธยา พร้อมที่พักสไตล์บูทีค",
    image: ayutthayaImage,
    price: 4500,
    originalPrice: 5500,
    duration: "3 วัน 2 คืน",
    location: "อยุธยา",
    maxPeople: 25,
    currentBookings: 18,
    tags: ["อยุธยา", "3 วัน", "วัด", "ประวัติศาสตร์", "มรดกโลก"],
    rating: 4.8,
    reviewCount: 156,
    date: "15-17 ธ.ค. 2567"
  },
  {
    id: "2", 
    title: "เกาะสวรรค์ 4 วัน 3 คืน พัทยา-เกาะล้าน",
    description: "ดำน้ำดูปะการัง เล่นกีฬาทางน้ำ และผ่อนคลายบนหาดทรายขาวสะอาด พร้อมที่พักติดทะเลและอาหารซีฟู๊ดสดใหม่",
    image: beachImage,
    price: 6800,
    originalPrice: 7800,
    duration: "4 วัน 3 คืน", 
    location: "พัทยา",
    maxPeople: 20,
    currentBookings: 12,
    tags: ["พัทยา", "เกาะล้าน", "ดำน้ำ", "ซีฟู๊ด", "4 วัน"],
    rating: 4.6,
    reviewCount: 89,
    date: "22-25 ธ.ค. 2567"
  },
  {
    id: "3",
    title: "ตลาดน้ำ 2 วัน 1 คืน ดำเนินสะดวก-อัมพวา",
    description: "เที่ยวตลาดน้ำแท้ๆ ชิมขนมหวานไทยโบราณ นั่งเรือชมบ้านริมคลอง และชมวิถีชีวิตแบบไทยดั้งเดิม",
    image: marketImage,
    price: 2200,
    originalPrice: 2800,
    duration: "2 วัน 1 คืน",
    location: "ราชบุรี",
    maxPeople: 30,
    currentBookings: 25,
    tags: ["ตลาดน้ำ", "อัมพวา", "ขนมไทย", "2 วัน", "วิถีไทย"],
    rating: 4.7,
    reviewCount: 203,
    date: "20-21 ธ.ค. 2567"
  },
  {
    id: "4",
    title: "ดอยสูง 3 วัน 2 คืน เชียงใหม่-ดอยอินทนนท์",
    description: "ผจญภัยบนยอดดอยที่สูงที่สุดในประเทศไทย ชมทะเลหมอก น้ำตก และชมวิถีชาวเขา พร้อมพักรีสอร์ทในธรรมชาติ",
    image: mountainImage,  
    price: 5200,
    originalPrice: 6200,
    duration: "3 วัน 2 คืน",
    location: "เชียงใหม่", 
    maxPeople: 15,
    currentBookings: 8,
    tags: ["เชียงใหม่", "ดอยอินทนนท์", "ทะเลหมอก", "ธรรมชาติ", "3 วัน"],
    rating: 4.9,
    reviewCount: 127,
    date: "18-20 ธ.ค. 2567"
  }
];