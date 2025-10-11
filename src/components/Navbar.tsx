import { Button } from "@/components/ui/button";
import {
  Plane,
  LogOut,
  BarChart3,
  Users,
  Settings,
  Package,
  User,
  ChevronDown,
  Percent,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { NotificationPanel } from "./NotificationPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          <Button
            variant="ghost"
            onClick={() => navigate("/packages")}
            className="text-foreground hover:text-primary"
          >
            <Package className="h-4 w-4 mr-2" />
            แพคเกจทั้งหมด
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/discount-codes")}
            className="text-foreground hover:text-primary"
          >
            <Percent className="h-4 w-4 mr-2" />
            โค้ดส่วนลด
          </Button>

          {user ? (
            <div className="flex items-center space-x-4">
              <NotificationPanel />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-foreground hover:text-primary flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-card border-border z-50"
                >
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.email}</p>
                      {userRole && (
                        <p className="text-xs text-muted-foreground">
                          ลอคอินในฐานะ{" "}
                          {userRole === "customer"
                            ? "นักท่องเที่ยว"
                            : userRole === "advertiser"
                            ? "คนกลาง"
                            : "ผู้จัดการ"}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer"
                  >
                    <User className="h-4 w-4 mr-2" />
                    โปรไฟล์
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/packages")}
                    className="cursor-pointer"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    แพคเกจทั้งหมด
                  </DropdownMenuItem>

                  {userRole === "advertiser" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/advertiser")}
                        className="cursor-pointer"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        แดชบอร์ด
                      </DropdownMenuItem>
                    </>
                  )}

                  {userRole === "manager" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/manager")}
                        className="cursor-pointer"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        จัดการ Discount Codes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/members")}
                        className="cursor-pointer"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        จัดการสมาชิก
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/package-management")}
                        className="cursor-pointer"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        จัดการแพคเกจ
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button
                variant="default"
                onClick={() => navigate("/auth")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-hero"
              >
                เข้าสู่ระบบ
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth?signup=true")}
                className="text-foreground hover:text-primary"
              >
                สมัครสมาชิก
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
