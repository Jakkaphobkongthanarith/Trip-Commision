import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Plane className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold bg-sunset-gradient bg-clip-text text-transparent">
            TravelCommission
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-foreground hover:text-primary">
            ลงทะเบียน
          </Button>
          <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-hero">
            เข้าสู่ระบบ
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;