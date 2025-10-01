import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchBar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (location) params.set('location', location);
    if (date) params.set('date', date);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    
    navigate(`/packages?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-card rounded-2xl shadow-card p-6 border border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
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
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            ราคาต่ำสุด (฿)
          </label>
          <Input
            type="number"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="border-muted focus:border-primary"
            min="0"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            ราคาสูงสุด (฿)
          </label>
          <Input
            type="number"
            placeholder="ไม่จำกัด"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="border-muted focus:border-primary"
            min="0"
          />
        </div>
        
        <Button 
          size="lg" 
          className="bg-sunset-gradient hover:opacity-90 text-white font-semibold shadow-card-hover transition-all duration-300 h-11"
          onClick={handleSearch}
        >
          <Search className="h-5 w-5 mr-2" />
          ค้นหา
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;