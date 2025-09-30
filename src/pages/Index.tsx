import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import TravelPackageCard from "@/components/TravelPackageCard";
import { packageAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const Index = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Helper function to normalize tags
  const normalizeTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string');
    if (typeof tags === 'string') {
      const cleanedTags = tags.replace(/[{}]/g, '');
      return cleanedTags.split(',').map(t => t.trim()).filter(t => t);
    }
    return [];
  };

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await packageAPI.getAll();
        // Normalize tags for all packages
        const normalizedData = (data || []).map(pkg => ({
          ...pkg,
          tags: normalizeTags(pkg.tags)
        }));
        setPackages(normalizedData);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);
  const [meow, setMeow] = useState("");

  const filteredPackages = selectedTag
    ? packages.filter((pkg) => pkg.tags?.includes(selectedTag))
    : packages;

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/meow`
    )
      .then((res) => res.json())
      .then((data) => {
        console.log("abc");
        console.log("fetch meow ->", data);
        setMeow(data.data);
      })
      .catch((err) => setMeow("error"));
  }, []);

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
  };

  const clearFilter = () => {
    setSelectedTag(null);
  };

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
            <div>
              <h1>Meow API Response:</h1>
              <p>{meow}</p>
            </div>
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
              เลือกจากแพคเกจท่องเที่ยวคุณภาพสูงที่คัดสรรมาเป็นพิเศษ
              พร้อมส่วนลดและโปรโมชั่นสุดพิเศษ
            </p>
            {selectedTag && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-muted-foreground">
                  กำลังแสดงแพคเกจที่มีแท็ก:
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearFilter}
                  className="gap-2"
                >
                  {selectedTag}
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full text-center">กำลังโหลด...</div>
            ) : (
              filteredPackages.map((pkg) => (
                <TravelPackageCard
                  key={pkg.id}
                  package={pkg}
                  onTagClick={handleTagClick}
                />
              ))
            )}
          </div>

          {selectedTag && filteredPackages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                ไม่มีแพคเกจท่องเที่ยวที่มีแท็ก "{selectedTag}"
              </p>
              <Button variant="outline" onClick={clearFilter} className="mt-4">
                ดูแพคเกจทั้งหมด
              </Button>
            </div>
          )}
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
