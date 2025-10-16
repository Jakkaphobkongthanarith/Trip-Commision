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
  Languages,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { NotificationPanel } from "./NotificationPanel";
import NotificationBell from "./NotificationBell";
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
  const { language, setLanguage, t } = useLanguage();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: t("toast.signOutError"),
        description: t("toast.signOutErrorDesc"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("toast.signOutSuccess"),
        description: t("toast.signOutSuccessDesc"),
      });
      navigate("/");
    }
  };

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border fixed top-0 left-0 right-0 z-50 h-16">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <Plane className="h-6 md:h-8 w-6 md:w-8 text-primary" />
          <h1 className="text-lg md:text-2xl font-bold bg-sunset-gradient bg-clip-text text-transparent">
            TravelCommission
          </h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLanguage(language === "th" ? "en" : "th")}
            className="text-foreground hover:text-primary"
            title={language === "th" ? "Switch to English" : "สลับเป็นภาษาไทย"}
          >
            <Languages className="h-4 w-4 mr-2" />
            {language === "th" ? "EN" : "ไทย"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/packages")}
            className="text-foreground hover:text-primary"
          >
            <Package className="h-4 w-4 mr-2" />
            {t("nav.packages")}
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
                          {t("nav.role.loggedInAs")}{" "}
                          {userRole === "customer"
                            ? t("nav.role.customer")
                            : userRole === "advertiser"
                            ? t("nav.role.advertiser")
                            : t("nav.role.manager")}
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
                    {t("nav.profile")}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/packages")}
                    className="cursor-pointer"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {t("nav.packages")}
                  </DropdownMenuItem>

                  {userRole === "advertiser" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/advertiser")}
                        className="cursor-pointer"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {t("nav.dashboard")}
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
                        {t("nav.manageMembers")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/package-management")}
                        className="cursor-pointer"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {t("nav.managePackages")}
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.signOut")}
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
                {t("nav.login")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth?signup=true")}
                className="text-foreground hover:text-primary"
              >
                {t("nav.signup")}
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === "th" ? "en" : "th")}
            title={language === "th" ? "Switch to English" : "สลับเป็นภาษาไทย"}
          >
            <Languages className="h-5 w-5" />
          </Button>

          {user && <NotificationBell />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
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
                        {t("nav.role.loggedInAs")}{" "}
                        {userRole === "customer"
                          ? t("nav.role.customer")
                          : userRole === "advertiser"
                          ? t("nav.role.advertiser")
                          : t("nav.role.manager")}
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
                  {t("nav.profile")}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate("/packages")}
                  className="cursor-pointer"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {t("nav.packages")}
                </DropdownMenuItem>

                {userRole === "advertiser" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/advertiser")}
                      className="cursor-pointer"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {t("nav.dashboard")}
                    </DropdownMenuItem>
                  </>
                )}

                {userRole === "manager" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/members")}
                      className="cursor-pointer"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {t("nav.manageMembers")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/package-management")}
                      className="cursor-pointer"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t("nav.managePackages")}
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("nav.login")}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
