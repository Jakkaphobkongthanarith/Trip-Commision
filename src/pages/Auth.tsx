import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/api";
import { Plane, Mail, Lock, User, UserCheck } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"customer" | "advertiser" | "manager">(
    "customer"
  );
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Check URL parameter for signup mode
  useEffect(() => {
    const signupParam = searchParams.get("signup");
    if (signupParam === "true") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: t("auth.loginFailed"),
        description:
          error.message === "Invalid login credentials"
            ? t("auth.invalidCredentials")
            : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("auth.loginSuccess"),
        description: t("auth.welcomeBack"),
      });
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create the user account with role
      const { error: signUpError } = await signUp(
        email,
        password,
        displayName,
        role
      );

      if (signUpError) {
        throw signUpError;
      }

      toast({
        title: t("auth.signupSuccess"),
        description: `ยินดีต้อนรับเข้าสู่ระบบ TravelCommission ในฐานะ${getRoleText(
          role
        )}!`,
      });
    } catch (error: any) {
      toast({
        title: t("auth.signupFailed"),
        description:
          error.message === "User already registered"
            ? t("auth.emailAlreadyUsed")
            : error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const getRoleText = (roleValue: string) => {
    switch (roleValue) {
      case "customer":
        return t("auth.tourist");
      case "advertiser":
        return t("auth.advertiser");
      case "manager":
        return t("auth.manager");
      default:
        return roleValue;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Plane className="h-10 w-10 text-white" />
            <h1 className="text-3xl font-bold text-white">TravelCommission</h1>
          </div>
          <p className="text-white/80">ระบบจัดการค่าคอมมิชชั่นการท่องเที่ยว</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">
              {isSignUp ? t("auth.signup") : t("auth.login")}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? t("auth.createNewAccount")
                : t("auth.loginWithAccount")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSignUp ? (
              // Sign In Form
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("auth.loggingIn") : t("auth.login")}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsSignUp(true)}
                    className="text-primary hover:underline"
                  >
                    ยังไม่มีบัญชี? สมัครสมาชิก
                  </Button>
                </div>
              </form>
            ) : (
              // Sign Up Form
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">ชื่อที่แสดง</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t("auth.yourName")}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">ประเภทผู้ใช้</Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select
                      value={role}
                      onValueChange={(
                        value: "customer" | "advertiser" | "manager"
                      ) => setRole(value)}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder={t("auth.selectUserType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">
                          {t("auth.tourist")}
                        </SelectItem>
                        <SelectItem value="advertiser">
                          {t("auth.advertiser")}
                        </SelectItem>
                        <SelectItem value="manager">
                          {t("auth.manager")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-signup">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">รหัสผ่าน</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-signup"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? t("auth.signingUp")
                    : `สมัครในฐานะ${getRoleText(role)}`}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsSignUp(false)}
                    className="text-primary hover:underline"
                  >
                    มีบัญชีแล้ว? เข้าสู่ระบบ
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
