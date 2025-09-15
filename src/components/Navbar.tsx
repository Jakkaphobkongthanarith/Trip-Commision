import { Button } from "@/components/ui/button";
import { Plane, LogOut, BarChart3, Users, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useUserRole();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "ขอบคุณที่ใช้บริการ",
      });
      navigate("/");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <Plane className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold bg-sunset-gradient bg-clip-text text-transparent">
            TravelCommission
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <NotificationBell />
              
              {/* Role-based navigation buttons */}
              {userRole === 'advertiser' && (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/advertiser")}
                    className="text-foreground hover:text-primary"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    แดชบอร์ด
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/members")}
                    className="text-foreground hover:text-primary"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    จัดการสมาชิก
                  </Button>
                </>
              )}
              
              {userRole === 'manager' && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/admin")}
                  className="text-foreground hover:text-primary"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  จัดการระบบ
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-foreground">สวัสดี, {user.email}</span>
                {userRole && (
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    ลอคอินในฐานะ {userRole === 'customer' ? 'นักท่องเที่ยว' : userRole === 'advertiser' ? 'คนกลาง' : 'ผู้จัดการ'}
                  </span>
                )}
              </div>
              <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="text-foreground hover:text-primary"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/auth")}
                className="text-foreground hover:text-primary"
              >
                ลงทะเบียน
              </Button>
              <Button 
                variant="default" 
                onClick={() => navigate("/auth")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-hero"
              >
                เข้าสู่ระบบ
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;