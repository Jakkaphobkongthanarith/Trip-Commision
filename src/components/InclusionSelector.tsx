import { useState, useEffect } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Inclusion {
  id: string;
  name: string;
  name_th?: string;
  name_en?: string;
  category?: string;
}

interface InclusionSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function InclusionSelector({
  selectedIds,
  onChange,
}: InclusionSelectorProps) {
  const [inclusions, setInclusions] = useState<Inclusion[]>([]);
  const [newInclusion, setNewInclusion] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetchInclusions();
  }, []);

  const fetchInclusions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inclusions`);
      if (!response.ok) throw new Error("Failed to fetch inclusions");
      const data = await response.json();
      setInclusions(data || []);
    } catch (error) {
      console.error("Error fetching inclusions:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการสิ่งที่รวมในแพคเกจได้",
        variant: "destructive",
      });
    }
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleAddNew = async () => {
    if (!newInclusion.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/inclusions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newInclusion.trim(),
          name_th: newInclusion.trim(),
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setInclusions([...inclusions, newItem]);
        onChange([...selectedIds, newItem.id]);
        setNewInclusion("");
        toast({
          title: "สำเร็จ",
          description: "เพิ่มรายการใหม่เรียบร้อยแล้ว",
        });
      }
    } catch (error) {
      console.error("Error adding inclusion:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มรายการได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((i) => i !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="inclusions">สิ่งที่รวมในแพคเกจ</Label>
        <p className="text-sm text-muted-foreground mt-1">
          เลือกหรือเพิ่มรายการที่รวมอยู่ในแพคเกจนี้
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newInclusion}
          onChange={(e) => setNewInclusion(e.target.value)}
          placeholder="พิมพ์รายการใหม่..."
          onKeyPress={(e) => e.key === "Enter" && handleAddNew()}
        />
        <Button
          type="button"
          onClick={handleAddNew}
          disabled={!newInclusion.trim() || loading}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[200px] border rounded-lg p-3">
        <div className="space-y-2">
          {inclusions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              ยังไม่มีรายการ กรุณาเพิ่มรายการใหม่
            </p>
          ) : (
            inclusions.map((inclusion) => (
              <div
                key={inclusion.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded border cursor-pointer transition-colors",
                  selectedIds.includes(inclusion.id)
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted"
                )}
                onClick={() => handleToggle(inclusion.id)}
              >
                <span className="text-sm">{inclusion.name}</span>
                {selectedIds.includes(inclusion.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {selectedIds.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            รายการที่เลือก ({selectedIds.length}):
          </Label>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => {
              const inclusion = inclusions.find((i) => i.id === id);
              return inclusion ? (
                <div
                  key={id}
                  className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                >
                  {inclusion.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 text-blue-600 hover:text-blue-800"
                    onClick={() => handleRemove(id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
