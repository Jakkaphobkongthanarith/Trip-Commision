import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Tag as TagIcon,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TagFilterProps {
  packages: any[];
}

export function TagFilter({ packages }: TagFilterProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedTag = searchParams.get("tag");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    packages.forEach((pkg) => {
      const tags = pkg.tags || [];
      tags.forEach((tag: string) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag, count]) => ({ tag, count }));
  }, [packages]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagCounts;
    return tagCounts.filter(({ tag }) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tagCounts, searchQuery]);

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      navigate("/packages");
    } else {
      navigate(`/packages?tag=${encodeURIComponent(tag)}`);
    }
    setOpen(false);
  };

  const handleClearAll = () => {
    setSearchQuery("");
    navigate("/packages");
    setOpen(false);
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("tags.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("tags.title")}</span>
        {selectedTag && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            <X className="h-4 w-4 mr-1" />
            {t("tags.clear")}
          </Button>
        )}
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-2">
          <Button
            variant={!selectedTag ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleTagClick("")}
          >
            <TagIcon className="h-4 w-4 mr-2" />
            {t("tags.all")}
            <Badge variant="outline" className="ml-auto">
              {packages.length}
            </Badge>
          </Button>

          {filteredTags.length > 0 ? (
            filteredTags.map(({ tag, count }) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTagClick(tag)}
              >
                <TagIcon className="h-4 w-4 mr-2" />
                <span className="truncate">{tag}</span>
                <Badge variant="outline" className="ml-auto">
                  {count}
                </Badge>
              </Button>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {t("tags.notFound")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop Filter */}
      <div
        className={`hidden md:block transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-80"
        }`}
      >
        <Card className="sticky top-24 h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  {t("tags.title")}
                </CardTitle>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-2 ${
                  isCollapsed ? "w-full justify-center" : "ml-auto"
                }`}
                title={isCollapsed ? "ขยาย sidebar" : "ย่อ sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          {!isCollapsed && (
            <CardContent>
              <FilterContent />
            </CardContent>
          )}

          {/* Collapsed state content */}
          {isCollapsed && (
            <CardContent className="p-2">
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(false)}
                  className="w-full p-2"
                  title="ขยาย sidebar"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {selectedTag && (
                  <div
                    className="w-2 h-2 bg-primary rounded-full"
                    title={`กรองด้วย: ${selectedTag}`}
                  />
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Mobile Filter Trigger */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Filter className="h-5 w-5 mr-2" />
              {t("tags.title")}
              {selectedTag && (
                <Badge className="ml-2" variant="secondary">
                  1
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-96">
            <SheetHeader>
              <SheetTitle>{t("tags.title")}</SheetTitle>
              <SheetDescription>เลือกหมวดหมู่เพื่อกรองแพคเกจ</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
