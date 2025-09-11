import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar } from "lucide-react";
import { useState } from "react";

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  return (
    <div className="w-full max-w-6xl mx-auto bg-card rounded-2xl shadow-card p-6 border border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4" />
            ค้นหาแพคเกจ
          </label>
          <Input
            placeholder="ป้อนชื่อแพคเกจหรือสถานที่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-muted focus:border-primary"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            จังหวัด/เมือง
          </label>
          <Input
            placeholder="เลือกจังหวัด..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border-muted focus:border-primary"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            วันเดินทาง
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-muted focus:border-primary"
          />
        </div>
        
        <Button 
          size="lg" 
          className="bg-sunset-gradient hover:opacity-90 text-white font-semibold shadow-card-hover transition-all duration-300 h-11"
        >
          <Search className="h-5 w-5 mr-2" />
          ค้นหา
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;