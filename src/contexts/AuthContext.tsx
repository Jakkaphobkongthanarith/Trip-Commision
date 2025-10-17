import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authAPI, profileAPI, API_BASE_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// Define custom User type (no longer using Supabase types)
interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  display_name?: string;
  role: "admin" | "manager" | "advertiser" | "customer";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    role?: string
  ) => Promise<{ error: any; data?: any }>;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  getStoredValue: (
    key: "token" | "userId" | "userEmail" | "userRole"
  ) => string | null;
  // Legacy support - deprecated, use user object instead
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Computed values
  const isAuthenticated = !!user && !!token;
  const userRole = user?.role || null;

  // ✅ รวมการจัดการ storage ไว้ที่เดียว
  const getStoredValue = (
    key:
      | "token"
      | "userId"
      | "userEmail"
      | "userRole"
      | "userName"
      | "userPhone"
      | "displayName"
  ): string | null => {
    const storageKey = key === "token" ? "authToken" : key;
    return (
      localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey)
    );
  };

  const setStoredValue = (
    key: string,
    value: string,
    persistent: boolean = true
  ) => {
    if (persistent) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key); // ลบจาก session ถ้ามี
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key); // ลบจาก local ถ้ามี
    }
  };

  const removeStoredValue = (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  };

  // ✅ อัปเดตข้อมูล user
  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData } as User;
      setUser(updatedUser);

      // อัปเดต storage
      const isPersistent = !!localStorage.getItem("userId");
      if (userData.email)
        setStoredValue("userEmail", userData.email, isPersistent);
      if (userData.role)
        setStoredValue("userRole", userData.role, isPersistent);
      if (userData.name)
        setStoredValue("userName", userData.name, isPersistent);
      if (userData.phone)
        setStoredValue("userPhone", userData.phone, isPersistent);
      if (userData.display_name)
        setStoredValue("displayName", userData.display_name, isPersistent);

      // อัปเดตข้อมูลใน profiles table ด้วย
      try {
        await profileAPI.update(user.id, {
          display_name: userData.display_name || updatedUser.display_name,
          phone: userData.phone || updatedUser.phone,
        });
        console.log("✅ Profile updated in database");
      } catch (error) {
        console.warn("⚠️ Failed to update profile in database:", error);
      }
    }
  };

  useEffect(() => {
    // Auto-recovery from localStorage on mount
    handleAutoRecovery();
  }, []);

  // JWT Auto-recovery
  const handleAutoRecovery = async () => {
    try {
      const storedToken = localStorage.getItem("authToken");
      const storedRole = localStorage.getItem("userRole");
      const storedUserId = localStorage.getItem("userId");
      const storedEmail = localStorage.getItem("userEmail");
      const storedName = localStorage.getItem("userName");
      const storedPhone = localStorage.getItem("userPhone");
      const storedDisplayName = localStorage.getItem("displayName");

      if (storedToken && storedRole) {
        console.log("🔄 Found stored token and role, restoring session...");

        // Create user object from stored data
        const restoredUser = {
          id: storedUserId || "unknown_user",
          email: storedEmail || "restored@session.local",
          role: storedRole as "admin" | "manager" | "advertiser" | "customer",
          name: storedName || undefined,
          phone: storedPhone || undefined,
          display_name: storedDisplayName || undefined,
        };

        console.log("🔄 Restored user object:", restoredUser);
        console.log("🔄 storedName:", storedName);
        console.log("🔄 storedPhone:", storedPhone);
        console.log("🔄 storedDisplayName:", storedDisplayName);

        setUser(restoredUser);
        setToken(storedToken);
        sessionStorage.setItem("userRole", storedRole);
        sessionStorage.setItem("userId", restoredUser.id);
        sessionStorage.setItem("userEmail", restoredUser.email);
        if (storedName) sessionStorage.setItem("userName", storedName);
        if (storedPhone) sessionStorage.setItem("userPhone", storedPhone);
        if (storedDisplayName)
          sessionStorage.setItem("displayName", storedDisplayName);

        console.log("✅ Session restored from localStorage:", {
          user,
          role: storedRole,
        });
      } else {
        console.log("ℹ️ No stored token or role found");
      }
    } catch (error) {
      console.warn("❌ Auto-recovery failed:", error);
      // Clear invalid tokens
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  // Clear all auth data
  const clearAuthData = () => {
    [
      "authToken",
      "userRole",
      "userId",
      "userEmail",
      "userName",
      "userPhone",
      "displayName",
      "refreshToken",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    setUser(null);
    setToken(null);
  };

  // Sign up function
  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
    role: string = "traveler"
  ) => {
    try {
      setLoading(true);
      console.log("📝 Attempting signup for:", email, "as", role);

      const response = await authAPI.signup({
        email,
        password,
        displayName,
        role,
      });

      console.log("🔍 Signup response:", response);

      // Check for access_token (Supabase format) or token (custom format)
      const token = response?.access_token || response?.token;
      const userRole = response?.role || role;

      if (response && token) {
        console.log("✅ Signup successful:", response);

        // Create user object from response
        const newUser = {
          id: response.user?.id || `user_${Date.now()}`,
          email: email,
          name:
            displayName || response.user?.name || response.user?.display_name,
          phone: response.user?.phone,
          display_name: response.user?.display_name || displayName,
          role: userRole as "admin" | "manager" | "advertiser" | "customer",
        };

        console.log("🔍 SignUp - newUser object:", newUser);
        console.log("🔍 SignUp - response.user:", response.user);

        // Fetch additional profile data from profiles table
        try {
          const profile = await profileAPI.getByUserId(newUser.id);
          console.log("🔍 SignUp - profile from API:", profile);

          // Update user object with profile data
          newUser.name = profile.display_name || newUser.name;
          newUser.phone = profile.phone;
          newUser.display_name = profile.display_name;

          console.log("🔍 SignUp - updated newUser:", newUser);
        } catch (profileError) {
          console.warn("⚠️ Could not fetch profile data:", profileError);
        }

        // Store auth data (default persistent = true)
        setStoredValue("authToken", token, true);
        setStoredValue("userRole", userRole, true);
        setStoredValue("userId", newUser.id, true);
        setStoredValue("userEmail", email, true);

        // Store additional profile data if available
        if (newUser.name) {
          console.log("📝 Storing userName:", newUser.name);
          setStoredValue("userName", newUser.name, true);
        }
        if (newUser.phone) {
          console.log("📝 Storing userPhone:", newUser.phone);
          setStoredValue("userPhone", newUser.phone, true);
        }
        if (newUser.display_name) {
          console.log("📝 Storing displayName:", newUser.display_name);
          setStoredValue("displayName", newUser.display_name, true);
        }

        // Store refresh token if available
        if (response.refresh_token) {
          setStoredValue("refreshToken", response.refresh_token, true);
        }

        setUser(newUser);
        setToken(token);

        return { error: null, data: response };
      } else {
        console.error("❌ Invalid signup response:", response);
        throw new Error(
          "Invalid registration response - missing access_token or token"
        );
      }
    } catch (error) {
      console.error("❌ Signup error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (
    email: string,
    password: string,
    rememberMe: boolean = true
  ) => {
    try {
      setLoading(true);
      console.log("🔐 Attempting login for:", email);

      const response = await authAPI.login({
        email,
        password,
      });

      console.log("🔍 Backend response structure:", response);

      // Check for access_token (Supabase format) or token (custom format)
      const token = response?.access_token || response?.token;
      const userRole = response?.role;

      if (response && token) {
        console.log("✅ Login successful:", response);

        // Create user object from response - use proper user ID from backend
        const loggedInUser = {
          id:
            response.user?.id ||
            response.id ||
            response.user_id ||
            email.split("@")[0],
          email: email,
          name:
            response.user?.name || response.user?.display_name || response.name,
          phone: response.user?.phone || response.phone,
          display_name: response.user?.display_name || response.display_name,
          role: userRole as "admin" | "manager" | "advertiser" | "customer",
        };

        console.log("🔍 SignIn - loggedInUser object:", loggedInUser);
        console.log("🔍 SignIn - response.user:", response.user);
        console.log("🔍 SignIn - response:", response);

        // Fetch additional profile data from profiles table
        try {
          const profile = await profileAPI.getByUserId(loggedInUser.id);
          console.log("🔍 SignIn - profile from API:", profile);

          // Update user object with profile data
          loggedInUser.name = profile.display_name || loggedInUser.name;
          loggedInUser.phone = profile.phone;
          loggedInUser.display_name = profile.display_name;

          console.log("🔍 SignIn - updated loggedInUser:", loggedInUser);
        } catch (profileError) {
          console.warn("⚠️ Could not fetch profile data:", profileError);
        }

        // Store auth data based on rememberMe preference
        setStoredValue("authToken", token, rememberMe);
        setStoredValue("userRole", userRole, rememberMe);
        setStoredValue("userId", loggedInUser.id, rememberMe);
        setStoredValue("userEmail", email, rememberMe);

        // Store additional profile data if available
        if (loggedInUser.name) {
          console.log("📝 SignIn - Storing userName:", loggedInUser.name);
          setStoredValue("userName", loggedInUser.name, rememberMe);
        }
        if (loggedInUser.phone) {
          console.log("📝 SignIn - Storing userPhone:", loggedInUser.phone);
          setStoredValue("userPhone", loggedInUser.phone, rememberMe);
        }
        if (loggedInUser.display_name) {
          console.log(
            "📝 SignIn - Storing displayName:",
            loggedInUser.display_name
          );
          setStoredValue("displayName", loggedInUser.display_name, rememberMe);
        }

        // Store refresh token if available
        if (response.refresh_token) {
          setStoredValue("refreshToken", response.refresh_token, rememberMe);
        }

        setUser(loggedInUser);
        setToken(token);

        return { error: null, data: response };
      } else {
        console.error("❌ Invalid response structure:", response);
        throw new Error(
          "Invalid login response - missing access_token or token"
        );
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      console.log("🚪 Logging out...");

      // Optional: Call backend logout endpoint with proper format
      const currentToken = token || localStorage.getItem("authToken");
      if (currentToken) {
        try {
          // Send token in proper format for logout
          await authAPI.logout({ token: currentToken });
        } catch (error) {
          console.warn("Backend logout failed:", error);
          // Continue with local logout even if backend fails
        }
      }

      // Clear auth data
      clearAuthData();

      console.log("✅ Logout successful");
      navigate("/");

      return { error: null };
    } catch (error) {
      console.error("❌ Logout error:", error);
      return { error };
    }
  };

  // Refresh auth data
  const refreshAuth = async () => {
    await handleAutoRecovery();
  };

  const value: AuthContextType = {
    user,
    token,
    userRole,
    isAuthenticated,
    loading,
    signUp,
    signIn,
    signOut,
    refreshAuth,
    updateUser,
    getStoredValue,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
