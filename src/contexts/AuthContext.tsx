import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authAPI, API_BASE_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// Define custom User type (no longer using Supabase types)
interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  userRole: string | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    role?: string
  ) => Promise<{ error: any; data?: any }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshAuth: () => Promise<void>;
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

      if (storedToken && storedRole) {
        console.log("🔄 Found stored token and role, restoring session...");

        // Create user object from stored data
        const user = {
          id: storedUserId || "unknown_user", // Use stored user ID
          email: storedEmail || "restored@session.local", // Use stored email
          role: storedRole,
        };

        setUser(user);
        setToken(storedToken);
        setUserRole(storedRole);
        sessionStorage.setItem("userRole", storedRole);
        sessionStorage.setItem("userId", user.id);
        sessionStorage.setItem("userEmail", user.email);

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
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userEmail");
    setUser(null);
    setToken(null);
    setUserRole(null);
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
        const user = {
          id: response.user?.id || `user_${Date.now()}`,
          email: email,
          name:
            displayName || response.user?.name || response.user?.display_name,
          role: userRole,
        };

        // Store auth data
        localStorage.setItem("authToken", token);
        localStorage.setItem("userRole", userRole);
        localStorage.setItem("userId", user.id);
        localStorage.setItem("userEmail", email);
        sessionStorage.setItem("userRole", userRole);
        sessionStorage.setItem("userId", user.id);
        sessionStorage.setItem("userEmail", email);

        // Store refresh token if available
        if (response.refresh_token) {
          localStorage.setItem("refreshToken", response.refresh_token);
        }

        setUser(user);
        setToken(token);
        setUserRole(userRole);

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
  const signIn = async (email: string, password: string) => {
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
        const user = {
          id:
            response.user?.id ||
            response.id ||
            response.user_id ||
            email.split("@")[0], // Try multiple ID sources
          email: email,
          name:
            response.user?.name || response.user?.display_name || response.name,
          role: userRole,
        };

        console.log("🔍 Created user object:", user);

        // Store auth data including user ID and email
        localStorage.setItem("authToken", token);
        localStorage.setItem("userRole", userRole);
        localStorage.setItem("userId", user.id); // Store user ID separately
        localStorage.setItem("userEmail", email); // Store email separately
        sessionStorage.setItem("userRole", userRole);
        sessionStorage.setItem("userId", user.id);
        sessionStorage.setItem("userEmail", email);

        // Store refresh token if available
        if (response.refresh_token) {
          localStorage.setItem("refreshToken", response.refresh_token);
        }

        setUser(user);
        setToken(token);
        setUserRole(userRole);

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
    loading,
    signUp,
    signIn,
    signOut,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
