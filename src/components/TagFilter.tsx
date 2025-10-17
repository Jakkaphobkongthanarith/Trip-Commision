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
  onCollapseChange?: (collapsed: boolean) => void;
  selectedTags?: string[];
}

export function TagFilter({
  packages,
  onCollapseChange,
  selectedTags = [],
}: TagFilterProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

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
    if (tag === "") {
      // Clear all filters when clicking "All"
      navigate("/packages");
    } else {
      const newSearchParams = new URLSearchParams(searchParams);

      // Check if tag is already selected
      const currentTags = newSearchParams.getAll("tag");
      if (currentTags.includes(tag)) {
        // Remove the tag if it's already selected
        newSearchParams.delete("tag");
        currentTags
          .filter((t) => t !== tag)
          .forEach((t) => newSearchParams.append("tag", t));
      } else {
        // Add the tag if it's not selected
        newSearchParams.append("tag", tag);
      }

      navigate(`/packages?${newSearchParams.toString()}`);
    }
    setOpen(false);
  };

  const handleClearAll = () => {
    setSearchQuery("");
    navigate("/packages");
    setOpen(false);
  };

  const FilterContent = () => (
    <div className="flex flex-col h-full space-y-4">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("tags.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-medium">{t("tags.title")}</span>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            <X className="h-4 w-4 mr-1" />
            {t("tags.clear")}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          <Button
            variant={selectedTags.length === 0 ? "secondary" : "ghost"}
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
                variant={selectedTags.includes(tag) ? "secondary" : "ghost"}
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
          isCollapsed ? "w-16" : "w-1/5"
        }`}
      >
        <Card
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] border-r z-40 flex flex-col bg-background transition-all duration-300 ${
            isCollapsed ? "w-16" : "w-1/5"
          }`}
        >
          <CardHeader className="pb-3 flex-shrink-0">
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
                onClick={handleCollapseToggle}
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
            <CardContent className="flex-1 overflow-hidden">
              <FilterContent />
            </CardContent>
          )}

          {/* Collapsed state content */}
          {isCollapsed && (
            <CardContent className="p-2 flex-1 flex flex-col justify-start">
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapseToggle}
                  className="w-full p-2"
                  title="ขยาย sidebar"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {selectedTags.length > 0 && (
                  <div
                    className="w-2 h-2 bg-primary rounded-full"
                    title={`กรองด้วย: ${selectedTags.join(", ")}`}
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
              {selectedTags.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {selectedTags.length}
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
