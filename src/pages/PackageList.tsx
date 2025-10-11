import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TravelPackageCard from "@/components/TravelPackageCard";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { packageAPI } from "@/lib/api";
import { X } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TagSidebar } from "@/components/TagSidebar";

const PackageList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(9); // แสดง 9 รายการ (3 แถว x 3 คอลัมน์)
  const selectedTag = searchParams.get("tag");
  const searchQuery = searchParams.get("search");
  const locationFilter = searchParams.get("location");
  const dateFilter = searchParams.get("date");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  // Helper function to normalize tags
  const normalizeTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string");
    if (typeof tags === "string") {
      const cleanedTags = tags.replace(/[{}]/g, "");
      return cleanedTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    }
    return [];
  };

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await packageAPI.getAll();

        // Filter เฉพาะ is_active ใน frontend (หรือจะเพิ่ม filter ใน backend ก็ได้)
        const activePackages = data.filter((pkg) => pkg.is_active !== false);
        // Normalize tags and apply discount for all packages
        const normalizedData = activePackages.map((pkg) => {
          const hasDiscount =
            pkg.discount_percentage && pkg.discount_percentage > 0;
          const originalPrice = hasDiscount
            ? pkg.price / (1 - pkg.discount_percentage / 100)
            : undefined;

          return {
            ...pkg,
            tags: normalizeTags(pkg.tags),
            originalPrice: originalPrice,
          };
        });
        setPackages(normalizedData);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  const filteredPackages = packages.filter((pkg) => {
    if (selectedTag && !pkg.tags?.includes(selectedTag)) return false;
    if (
      searchQuery &&
      !pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (
      locationFilter &&
      !pkg.location.toLowerCase().includes(locationFilter.toLowerCase())
    )
      return false;
    if (minPrice && pkg.price < parseFloat(minPrice)) return false;
    if (maxPrice && pkg.price > parseFloat(maxPrice)) return false;
    return true;
  });

  // จำนวนรายการที่จะแสดง
  const displayedPackages = filteredPackages.slice(0, visibleCount);
  const hasMorePackages = filteredPackages.length > visibleCount;

  // ฟังก์ชันโหลดเพิ่ม
  const loadMore = () => {
    setVisibleCount((prev) => prev + 9); // เพิ่มทีละ 9 รายการ (3 แถว)
  };

  // รีเซ็ตการแสดงผลเมื่อเปลี่ยน filter
  useEffect(() => {
    setVisibleCount(9);
  }, [selectedTag, searchQuery, locationFilter, minPrice, maxPrice]);

  const handleTagClick = (tag: string) => {
    navigate(`/packages?tag=${encodeURIComponent(tag)}`);
  };

  const clearFilter = () => {
    navigate("/packages");
    setVisibleCount(9); // รีเซ็ตการแสดงผลกลับไปเป็น 9 รายการ
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full flex">
        <TagSidebar packages={packages} />
        
        <div className="flex-1 flex flex-col w-full">
          <Navbar />

          <main className="pt-20 flex-1">
            {/* Sidebar Toggle Button - Fixed position */}
            <div className="fixed top-24 left-4 z-40">
              <SidebarTrigger className="bg-background border shadow-md hover:bg-muted" />
            </div>

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
              <div className="container mx-auto px-6 text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-sunset-gradient bg-clip-text text-transparent">
                  แพคเกจท่องเที่ยว
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  ค้นพบประสบการณ์การเดินทางที่น่าประทับใจ พร้อมข้อเสนอพิเศษสำหรับคุณ
                </p>
                <SearchBar />
              </div>
            </section>

            {/* Package List Section */}
            <section className="py-16">
              <div className="container mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">
                      {selectedTag
                        ? `แพคเกจประเภท: ${selectedTag}`
                        : "แพคเกจทั้งหมด"}
                    </h2>
                    <p className="text-muted-foreground">
                      พบ {filteredPackages.length} แพคเกจ
                    </p>
                  </div>

                  {selectedTag && (
                    <Button
                      variant="outline"
                      onClick={clearFilter}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      ดูทั้งหมด
                    </Button>
                  )}
                </div>

                {selectedTag && (
                  <div className="mb-6">
                    <Badge variant="default" className="text-base px-4 py-2">
                      {selectedTag}
                    </Badge>
                  </div>
                )}

                {filteredPackages.length > 0 ? (
                  loading ? (
                    <div className="text-center py-8">กำลังโหลด...</div>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayedPackages.map((packageItem) => (
                          <TravelPackageCard
                            key={packageItem.id}
                            package={packageItem}
                            onTagClick={handleTagClick}
                          />
                        ))}
                      </div>

                      {/* ปุ่ม Load More */}
                      {hasMorePackages && (
                        <div className="text-center mt-12">
                          <Button
                            onClick={loadMore}
                            variant="outline"
                            size="lg"
                            className="px-8 py-3 text-lg"
                          >
                            โหลดเพิ่มเติม ({filteredPackages.length - visibleCount}{" "}
                            รายการ)
                          </Button>
                        </div>
                      )}

                      {/* แสดงจำนวนรายการปัจจุบัน */}
                      {filteredPackages.length > 0 && (
                        <div className="text-center mt-6">
                          <p className="text-muted-foreground">
                            แสดง {Math.min(visibleCount, filteredPackages.length)}{" "}
                            จาก {filteredPackages.length} รายการ
                          </p>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">
                      ไม่พบแพคเกจที่ตรงกับการค้นหา
                    </p>
                    <Button onClick={clearFilter}>ดูแพคเกจทั้งหมด</Button>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PackageList;
