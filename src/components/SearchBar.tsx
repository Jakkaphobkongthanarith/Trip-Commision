import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const SearchBar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (location) params.set("location", location);

    // Format date range
    if (dateRange?.from) {
      params.set("date", format(dateRange.from, "yyyy-MM-dd"));
    }

    // Price range
    if (priceRange[0] > 0 || priceRange[1] < 50000) {
      params.set("minPrice", priceRange[0].toString());
      params.set("maxPrice", priceRange[1].toString());
    }

    navigate(`/packages?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-card rounded-2xl shadow-elegant p-8 border border-border/50 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
        <div className="space-y-3 lg:col-span-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            ค้นหาแพคเกจ
          </label>
          <Input
            placeholder="ชื่อแพคเกจ, สถานที่, จังหวัด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 border-muted/50 focus:border-primary bg-background/50 backdrop-blur-sm transition-all"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            วันเดินทาง
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal border-muted/50 bg-background/50 backdrop-blur-sm hover:bg-accent transition-all",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM", { locale: th })} -{" "}
                      {format(dateRange.to, "dd MMM yyyy", { locale: th })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM yyyy", { locale: th })
                  )
                ) : (
                  <span>เลือกช่วงวันที่</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-popover border-border shadow-elegant"
              align="start"
            >
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
                locale={th}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            ช่วงราคา: ฿{priceRange[0].toLocaleString()} - ฿
            {priceRange[1].toLocaleString()}
          </label>
          <div className="px-4 py-6 rounded-lg border border-muted/50 bg-background/50 backdrop-blur-sm space-y-4">
            <Slider
              min={0}
              max={50000}
              step={1000}
              value={priceRange}
              onValueChange={(value) =>
                setPriceRange(value as [number, number])
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>฿0</span>
              <span>฿50,000</span>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="lg:col-span-2 bg-sunset-gradient hover:opacity-90 text-white font-semibold shadow-elegant hover:shadow-glow transition-all duration-300 h-12 self-center"
          onClick={handleSearch}
        >
          <Search className="h-5 w-5 mr-2" />
          ค้นหาแพคเกจ
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
