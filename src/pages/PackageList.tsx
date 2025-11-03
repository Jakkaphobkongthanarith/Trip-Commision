import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import TravelPackageCard from "@/components/TravelPackageCard";
import SearchBar from "@/components/SearchBar";
import { TagFilter } from "@/components/TagFilter";
import { packageAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const MainContent = ({
  selectedTags,
  filteredPackages,
  loading,
  displayedPackages,
  handleTagClick,
  clearFilter,
  hasMorePackages,
  loadMore,
  visibleCount,
  isCollapsed,
  removeTag,
}: any) => {
  const { t } = useLanguage();

  return (
    <div
      className={`flex-1 bg-background transition-all duration-300 ${
        isCollapsed ? "" : "md:ml-[20%]"
      }`}
    >
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-sunset-gradient bg-clip-text text-transparent">
              {t("packages.title")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("packages.description")}
            </p>
            <SearchBar />
          </div>
        </section>

        {/* Package List Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {selectedTags.length > 0
                    ? `${t("packages.category")} ${selectedTags.join(", ")}`
                    : t("packages.all")}
                </h2>
                <p className="text-muted-foreground">
                  {t("packages.found")} {filteredPackages.length}{" "}
                  {t("packages.items")}
                </p>
              </div>

              {selectedTags.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearFilter}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  {t("packages.viewAllButton")}
                </Button>
              )}
            </div>

            {selectedTags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {selectedTags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="text-base px-4 py-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-2" />
                  </Badge>
                ))}
              </div>
            )}

            {filteredPackages.length > 0 ? (
              loading ? (
                <div className="text-center py-8">{t("packages.loading")}</div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayedPackages.map((packageItem: any) => (
                      <TravelPackageCard
                        key={packageItem.id}
                        package={packageItem}
                        onTagClick={handleTagClick}
                      />
                    ))}
                  </div>

                  {hasMorePackages && (
                    <div className="text-center mt-12">
                      <Button
                        onClick={loadMore}
                        variant="outline"
                        size="lg"
                        className="px-8 py-3 text-lg"
                      >
                        {t("packages.loadMore")} (
                        {filteredPackages.length - visibleCount}{" "}
                        {t("packages.items2")})
                      </Button>
                    </div>
                  )}

                  {filteredPackages.length > 0 && (
                    <div className="text-center mt-6">
                      <p className="text-muted-foreground">
                        {t("packages.showing")}{" "}
                        {Math.min(visibleCount, filteredPackages.length)}{" "}
                        {t("packages.from")} {filteredPackages.length}{" "}
                        {t("packages.items2")}
                      </p>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground mb-4">
                  {t("packages.noResults")}
                </p>
                <Button onClick={clearFilter}>
                  {t("packages.viewAllButton")}
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const PackageList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(9);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedTags = searchParams.getAll("tag").filter((tag) => tag);
  const searchQuery = searchParams.get("search");
  const locationFilter = searchParams.get("location");
  const dateFilter = searchParams.get("date");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

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
        const activePackages = data.filter(
          (pkg: any) => pkg.is_active !== false
        );

        const normalizedData = activePackages.map((pkg: any) => {
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

  const filteredPackages = packages.filter((pkg: any) => {
    if (selectedTags.length > 0) {
      const hasAllTags = selectedTags.every((tag) => pkg.tags?.includes(tag));
      if (!hasAllTags) return false;
    }

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

  const displayedPackages = filteredPackages.slice(0, visibleCount);
  const hasMorePackages = filteredPackages.length > visibleCount;

  console.log("Package Stats:", {
    totalPackages: packages.length,
    filteredPackages: filteredPackages.length,
    visibleCount,
    displayedPackages: displayedPackages.length,
    hasMorePackages,
  });

  const loadMore = () => {
    console.log("🔄 Load More clicked");
    console.log("Current visibleCount:", visibleCount);
    console.log("📦 Total filteredPackages:", filteredPackages.length);

    setVisibleCount((prev) => {
      const newCount = prev + 9;
      console.log("📈 New visibleCount:", newCount);
      return newCount;
    });
  };

  useEffect(() => {
    console.log("Filters changed, resetting visibleCount to 9");
    setVisibleCount(9);
  }, [selectedTags.join(","), searchQuery, locationFilter, minPrice, maxPrice]);

  const handleTagClick = (tag: string) => {
    const newSearchParams = new URLSearchParams(searchParams);

    const currentTags = newSearchParams.getAll("tag");
    if (currentTags.includes(tag)) {
      newSearchParams.delete("tag");
      currentTags
        .filter((t) => t !== tag)
        .forEach((t) => newSearchParams.append("tag", t));
    } else {
      newSearchParams.append("tag", tag);
    }

    navigate(`/packages?${newSearchParams.toString()}`);
  };

  const removeTag = (tagToRemove: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("tag");

    selectedTags
      .filter((tag) => tag !== tagToRemove)
      .forEach((tag) => {
        newSearchParams.append("tag", tag);
      });

    navigate(`/packages?${newSearchParams.toString()}`);
  };

  const clearFilter = () => {
    navigate("/packages");
    setVisibleCount(9);
  };

  return (
    <div className="w-full bg-background min-h-screen">
      <div className="flex w-full">
        {/* Desktop Sidebar - Fixed positioning */}
        <div className="hidden md:block">
          <TagFilter
            packages={packages}
            onCollapseChange={setIsCollapsed}
            selectedTags={selectedTags}
          />
        </div>

        <MainContent
          selectedTags={selectedTags}
          filteredPackages={filteredPackages}
          loading={loading}
          displayedPackages={displayedPackages}
          handleTagClick={handleTagClick}
          clearFilter={clearFilter}
          hasMorePackages={hasMorePackages}
          loadMore={loadMore}
          visibleCount={visibleCount}
          isCollapsed={isCollapsed}
          removeTag={removeTag}
        />
      </div>

      {/* Mobile filter - แสดงเฉพาะ mobile */}
      <div className="md:hidden">
        <TagFilter packages={packages} selectedTags={selectedTags} />
      </div>
    </div>
  );
};

export default PackageList;
