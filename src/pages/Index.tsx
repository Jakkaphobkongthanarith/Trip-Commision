import { useState } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import TravelPackageCard from "@/components/TravelPackageCard";
import { mockPackages } from "@/data/mockPackages";

const Index = () => {
  const [packages] = useState(mockPackages);

  return (
    <div className="min-h-screen bg-sky-gradient">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-sunset-gradient bg-clip-text text-transparent">
                ค้นพบ
              </span>
              <span className="text-foreground"> การเดินทางที่</span>
              <br />
              <span className="bg-sunset-gradient bg-clip-text text-transparent">
                ไม่เหมือนใคร
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              แพลตฟอร์มท่องเที่ยวที่รวมแพคเกจสุดพิเศษจากทั่วประเทศไทย
              <br />
              พร้อมระบบส่วนลดและค่าคอมมิชชั่นสำหลับนักโฆษณา
            </p>
          </div>
          
          <SearchBar />
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              แพคเกจท่องเที่ยวยอดนิยม
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              เลือกจากแพคเกจท่องเที่ยวคุณภาพสูงที่คัดสรรมาเป็นพิเศษ พร้อมส่วนลดและโปรโมชั่นสุดพิเศษ
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <TravelPackageCard key={pkg.id} package={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-card/50">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            พร้อมเริ่มต้นการเดินทางแล้วใช่มั้ย?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            สมัครสมาชิกวันนี้เพื่อรับส่วนลดพิเศษและข้อเสนอสุดพิเศษจากเรา
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
