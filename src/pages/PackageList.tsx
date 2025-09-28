import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TravelPackageCard from "@/components/TravelPackageCard";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { packageAPI } from "@/lib/api";
import { X } from "lucide-react";

const PackageList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedTag = searchParams.get("tag");
  const searchQuery = searchParams.get("search");
  const locationFilter = searchParams.get("location");
  const dateFilter = searchParams.get("date");

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await packageAPI.getAll();

        // Filter เฉพาะ is_active ใน frontend (หรือจะเพิ่ม filter ใน backend ก็ได้)
        const activePackages = data.filter((pkg) => pkg.is_active !== false);
        setPackages(activePackages || []);
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
    return true;
  });

  const handleTagClick = (tag: string) => {
    navigate(`/packages?tag=${encodeURIComponent(tag)}`);
  };

  const clearFilter = () => {
    navigate("/packages");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredPackages.map((packageItem) => (
                    <TravelPackageCard
                      key={packageItem.id}
                      package={packageItem}
                      onTagClick={handleTagClick}
                    />
                  ))}
                </div>
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
  );
};

export default PackageList;
