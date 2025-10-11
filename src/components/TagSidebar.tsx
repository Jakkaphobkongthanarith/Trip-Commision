import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Tag as TagIcon } from "lucide-react";

interface TagSidebarProps {
  packages: any[];
}

export function TagSidebar({ packages }: TagSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedTag = searchParams.get("tag");
  const [searchQuery, setSearchQuery] = useState("");

  // คำนวณ tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    packages.forEach((pkg) => {
      const tags = pkg.tags || [];
      tags.forEach((tag: string) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    // เรียงตามจำนวน
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag, count]) => ({ tag, count }));
  }, [packages]);

  // กรอง tag ตามการค้นหา
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagCounts;
    
    const query = searchQuery.toLowerCase();
    return tagCounts.filter(({ tag }) => 
      tag.toLowerCase().includes(query)
    );
  }, [tagCounts, searchQuery]);

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      navigate("/packages");
    } else {
      navigate(`/packages?tag=${encodeURIComponent(tag)}`);
    }
  };

  const handleClearAll = () => {
    navigate("/packages");
    setSearchQuery("");
  };

  // Always render sidebar; offcanvas handles hide/show
  return (
    <Sidebar className="w-72" collapsible="offcanvas">
      <SidebarHeader className="border-b px-4 py-3 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">หมวดหมู่</h2>
          </div>
          <SidebarTrigger className="hover:bg-muted ml-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหา tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <SidebarGroupLabel>
            <div className="flex items-center justify-between w-full">
              <span>แท็กทั้งหมด ({filteredTags.length})</span>
              {selectedTag && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-primary hover:underline"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <ScrollArea className="max-h-[calc(100svh-220px)]">
              <SidebarMenu>
                {filteredTags.length > 0 ? (
                  filteredTags.map(({ tag, count }) => {
                    const isActive = selectedTag === tag;
                    
                    return (
                      <SidebarMenuItem key={tag}>
                        <SidebarMenuButton
                          onClick={() => handleTagClick(tag)}
                          className={
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/50"
                          }
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{tag}</span>
                            <Badge 
                              variant={isActive ? "default" : "secondary"}
                              className="ml-auto text-xs"
                            >
                              {count}
                            </Badge>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    ไม่พบ tag ที่ค้นหา
                  </div>
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
