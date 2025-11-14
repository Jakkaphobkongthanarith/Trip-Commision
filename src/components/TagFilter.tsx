import { useState, useMemo, useCallback, memo } from "react";
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

// แยก FilterContent ออกมาเป็น component แยก
const FilterContent = memo(
  ({
    t,
    searchQuery,
    onSearchChange,
    selectedTags,
    onClearAll,
    onTagClick,
    packages,
    filteredTags,
  }: {
    t: any;
    searchQuery: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedTags: string[];
    onClearAll: () => void;
    onTagClick: (tag: string) => void;
    packages: any[];
    filteredTags: { tag: string; count: number }[];
  }) => (
    <div className="flex flex-col h-full space-y-4">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t("tags.search")}
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-10"
        />
      </div>

      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-medium">{t("tags.title")}</span>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
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
            onClick={() => onTagClick("")}
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
                onClick={() => onTagClick(tag)}
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
  )
);

FilterContent.displayName = "FilterContent";

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

  const handleTagClick = useCallback(
    (tag: string) => {
      if (tag === "") {
        navigate("/packages");
      } else {
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
      }
      setOpen(false);
    },
    [navigate, searchParams]
  );

  const handleClearAll = useCallback(() => {
    setSearchQuery("");
    navigate("/packages");
    setOpen(false);
  }, [navigate]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
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
                  <span className="break-words whitespace-normal">
                    {t("tags.title")}
                  </span>
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
              <FilterContent
                t={t}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                selectedTags={selectedTags}
                onClearAll={handleClearAll}
                onTagClick={handleTagClick}
                packages={packages}
                filteredTags={filteredTags}
              />
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
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader className="flex-shrink-0">
              <SheetTitle>{t("tags.title")}</SheetTitle>
              <SheetDescription>เลือกหมวดหมู่เพื่อกรองแพคเกจ</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex-1 overflow-hidden">
              <FilterContent
                t={t}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                selectedTags={selectedTags}
                onClearAll={handleClearAll}
                onTagClick={handleTagClick}
                packages={packages}
                filteredTags={filteredTags}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
