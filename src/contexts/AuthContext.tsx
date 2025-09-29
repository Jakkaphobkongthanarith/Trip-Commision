import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authAPI } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Token expiry checker
  useEffect(() => {
    if (!session?.expires_at) return;

    const checkTokenExpiry = () => {
      const expiryTime = new Date(session.expires_at! * 1000);
      const currentTime = new Date();
      const timeUntilExpiry = expiryTime.getTime() - currentTime.getTime();

      console.log("Token expires at:", expiryTime.toLocaleString());
      console.log("Current time:", currentTime.toLocaleString());
      console.log(
        "Time until expiry (minutes):",
        Math.round(timeUntilExpiry / 60000)
      );

      // ถ้า token หมดอายุแล้ว
      if (timeUntilExpiry <= 0) {
        console.log("Token expired, forcing logout...");
        handleExpiredSession();
        return;
      }

      // ถ้าเหลือเวลาน้อยกว่า 5 นาที ให้ refresh token
      if (timeUntilExpiry < 5 * 60 * 1000) {
        // 5 minutes
        console.log("Token expiring soon, attempting refresh...");
        supabase.auth.refreshSession().then(({ data, error }) => {
          if (error) {
            console.error("Token refresh failed:", error);
            handleExpiredSession();
          } else {
            console.log("Token refreshed successfully");
          }
        });
      }
    };

    // เช็คทันทีแล้วเช็คทุกนาที
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000); // ทุก 1 นาที

    return () => clearInterval(interval);
  }, [session?.expires_at]);

  const handleExpiredSession = async () => {
    console.log("Handling expired session...");

    // Clear state
    setUser(null);
    setSession(null);

    // Clear browser storage manually
    try {
      localStorage.removeItem("supabase.auth.token");
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }

    // Redirect to login (ถ้าไม่อยู่หน้า auth อยู่แล้ว)
    if (window.location.pathname !== "/auth") {
      console.log("Redirecting to login page...");
      window.location.href = "/auth";
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);

      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === "SIGNED_IN") {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === "USER_UPDATED") {
        setSession(session);
        setUser(session?.user ?? null);
      }

      setLoading(false);
    });

    // Get initial session with error handling
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn("Initial session error:", error);
          // Try to refresh if error
          const {
            data: { session: refreshedSession },
          } = await supabase.auth.refreshSession();
          setSession(refreshedSession);
          setUser(refreshedSession?.user ?? null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error("Failed to get initial session:", err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    try {
      // Sign up with Supabase directly
      const { data: supabaseData, error: supabaseError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || "",
            },
          },
        });

      if (supabaseError) {
        console.error("Supabase sign up error:", supabaseError);
        return { error: supabaseError };
      }

      // Also call backend API (optional)
      try {
        await authAPI.signup({
          email,
          password,
          display_name: displayName || "",
        });
      } catch (backendError) {
        console.warn("Backend signup error (continuing anyway):", backendError);
      }

      return { error: null, data: supabaseData };
    } catch (error) {
      console.error("Sign up error:", error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clear browser storage manually before login
      try {
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.clear();
      } catch (e) {
        console.warn("Storage clear error:", e);
      }

      // Then sign in with Supabase directly
      const { data: supabaseData, error: supabaseError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (supabaseError) {
        console.error("Supabase sign in error:", supabaseError);
        return { error: supabaseError };
      }

      // Also call backend API (optional)
      try {
        await authAPI.login({ email, password });
      } catch (backendError) {
        console.warn("Backend login error (continuing anyway):", backendError);
      }

      return { error: null, data: supabaseData };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error };
    }
  };

  // ฟังก์ชัน signOut ใน AuthContext.tsx
  async function signOut(): Promise<{ error: any }> {
    console.log("Starting logout process...");
    console.log("Current session:", session);

    // ตรวจสอบ session validity อย่างรอบคอบ
    let hasValidSession = false;

    if (session?.access_token) {
      if (session.expires_at) {
        const expiryDate = new Date(session.expires_at * 1000);
        const now = new Date();
        hasValidSession = expiryDate > now;
        console.log(
          "Session expires at:",
          expiryDate,
          "Current time:",
          now,
          "Valid:",
          hasValidSession
        );
      } else {
        // ถ้าไม่มี expires_at ให้ถือว่า session ไม่ valid
        hasValidSession = false;
        console.log("No expires_at found, assuming session is invalid");
      }
    } else {
      console.log("No access token found");
    }

    // เรียก backend logout API เสมอ (สำคัญสำหรับ UI feedback)
    try {
      const response = await fetch("http://localhost:8080/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: session?.access_token || "expired_token",
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend logout failed: ${response.status}`);
      }

      console.log("Backend logout successful");

      // เมื่อ backend logout สำเร็จ ค่อย clear local state
      setUser(null);
      setSession(null);

      // Clear browser storage manually (no API calls)
      try {
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.clear();
      } catch (storageError) {
        console.warn("Storage clear error:", storageError);
      }

      console.log("Logout completed successfully");
      return { error: null };
    } catch (backendError) {
      console.error("Backend logout failed:", backendError);

      // ถ้า backend logout fail ให้ return error
      // UI จะไม่แสดงข้อความสำเร็จ
      return { error: backendError };
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
