import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import TravelPackageCard from "@/components/TravelPackageCard";
import { packageAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isConnected } = useNotifications();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(9);

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
        // Normalize tags for all packages
        const normalizedData = (data || []).map((pkg) => ({
          ...pkg,
          tags: normalizeTags(pkg.tags),
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

  // จำนวนรายการที่จะแสดง
  const displayedPackages = filteredPackages.slice(0, visibleCount);
  const hasMorePackages = filteredPackages.length > visibleCount;

  // ฟังก์ชันไปหน้าแพคเกจทั้งหมด
  const viewAllPackages = () => {
    if (selectedTag) {
      navigate(`/packages?tag=${encodeURIComponent(selectedTag)}`);
    } else {
      navigate("/packages");
    }
  };

  // รีเซ็ตการแสดงผลเมื่อเปลี่ยน filter
  useEffect(() => {
    setVisibleCount(9);
  }, [selectedTag]);

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
    setVisibleCount(9); // รีเซ็ตการแสดงผลกลับไปเป็น 9 รายการ
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-16 pb-16 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-sunset-gradient bg-clip-text text-transparent">
                {t("hero.discover")}
              </span>
              <span className="text-foreground"> {t("hero.journey")}</span>
              <br />
              <span className="bg-sunset-gradient bg-clip-text text-transparent">
                {t("hero.unique")}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {t("hero.description")}
              <br />
              {t("hero.description2")}
            </p>
            <div>
              <h1>Meow API Response:</h1>
              <p>{meow}</p>
              <h1>WS Status:</h1>
              <p
                style={{
                  color: isConnected ? "green" : "red",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </p>

              {/* Test WebSocket Button */}
              {user?.id && isConnected && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(
                        `${
                          import.meta.env.VITE_API_BASE_URL ||
                          "http://localhost:8000"
                        }/api/test-notification`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            user_id: user.id,
                            title: "Test WebSocket",
                            message:
                              "This is a test notification via WebSocket!",
                          }),
                        }
                      );

                      if (response.ok) {
                        console.log("✅ Test notification sent");
                      } else {
                        console.error("❌ Failed to send test notification");
                      }
                    } catch (error) {
                      console.error("❌ Error:", error);
                    }
                  }}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  🧪 Test WebSocket Notification
                </button>
              )}
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
              {t("packages.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("packages.description")}
              {t("packages.description2")}
            </p>
            {/* ปุ่มดูแพคเกจทั้งหมด */}
            {!loading && hasMorePackages && (
              <div className="text-center mt-12">
                <Button
                  onClick={viewAllPackages}
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 text-lg"
                >
                  {t("packages.viewAll")}
                </Button>
              </div>
            )}
            {selectedTag && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-muted-foreground">
                  {t("packages.showingTag")}
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
              <div className="col-span-full text-center">
                {t("packages.loading")}
              </div>
            ) : (
              displayedPackages.map((pkg) => (
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
                {t("packages.noResults")}
              </p>
              <Button variant="outline" onClick={clearFilter} className="mt-4">
                {t("packages.viewAll")}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-card/50">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            {t("cta.title")}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t("cta.description")}
          </p>
        </div>
      </section>
    </>
  );
};

export default Index;
