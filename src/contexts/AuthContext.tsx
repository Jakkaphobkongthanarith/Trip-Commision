import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authAPI, profileAPI, API_BASE_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";
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

  const isAuthenticated = !!user && !!token;
  const userRole = user?.role || null;

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
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  };

  const removeStoredValue = (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData } as User;
      setUser(updatedUser);

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

      try {
        await profileAPI.update(user.id, {
          display_name: userData.display_name || updatedUser.display_name,
          phone: userData.phone || updatedUser.phone,
        });
        console.log("Profile updated in database");
      } catch (error) {
        console.warn("Failed to update profile in database:", error);
      }
    }
  };

  useEffect(() => {
    handleAutoRecovery();
  }, []);

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
        const restoredUser = {
          id: storedUserId || "unknown_user",
          email: storedEmail || "restored@session.local",
          role: storedRole as "admin" | "manager" | "advertiser" | "customer",
          name: storedName || undefined,
          phone: storedPhone || undefined,
          display_name: storedDisplayName || undefined,
        };

        setUser(restoredUser);
        setToken(storedToken);
        sessionStorage.setItem("userRole", storedRole);
        sessionStorage.setItem("userId", restoredUser.id);
        sessionStorage.setItem("userEmail", restoredUser.email);
        if (storedName) sessionStorage.setItem("userName", storedName);
        if (storedPhone) sessionStorage.setItem("userPhone", storedPhone);
        if (storedDisplayName)
          sessionStorage.setItem("displayName", storedDisplayName);
      } else {
      }
    } catch (error) {
      console.warn("Auto-recovery failed:", error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

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

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
    role: string = "traveler"
  ) => {
    try {
      setLoading(true);

      const response = await authAPI.signup({
        email,
        password,
        displayName,
        role,
      });

      const token = response?.access_token || response?.token;
      const userRole = response?.role || role;

      if (response && token) {
        const newUser = {
          id: response.user?.id || `user_${Date.now()}`,
          email: email,
          name:
            displayName || response.user?.name || response.user?.display_name,
          phone: response.user?.phone,
          display_name: response.user?.display_name || displayName,
          role: userRole as "admin" | "manager" | "advertiser" | "customer",
        };

        try {
          const profile = await profileAPI.getByUserId(newUser.id);

          newUser.name = profile.display_name || newUser.name;
          newUser.phone = profile.phone;
          newUser.display_name = profile.display_name;
        } catch (profileError) {}

        setStoredValue("authToken", token, true);
        setStoredValue("userRole", userRole, true);
        setStoredValue("userId", newUser.id, true);
        setStoredValue("userEmail", email, true);

        if (newUser.name) {
          setStoredValue("userName", newUser.name, true);
        }
        if (newUser.phone) {
          setStoredValue("userPhone", newUser.phone, true);
        }
        if (newUser.display_name) {
          setStoredValue("displayName", newUser.display_name, true);
        }

        if (response.refresh_token) {
          setStoredValue("refreshToken", response.refresh_token, true);
        }

        setUser(newUser);
        setToken(token);

        return { error: null, data: response };
      } else {
        console.error("Invalid signup response:", response);
        throw new Error(
          "Invalid registration response - missing access_token or token"
        );
      }
    } catch (error) {
      console.error("Signup error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string,
    rememberMe: boolean = true
  ) => {
    try {
      setLoading(true);

      const response = await authAPI.login({
        email,
        password,
      });

      const token = response?.access_token || response?.token;
      const userRole = response?.role;

      if (response && token) {
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

        try {
          const profile = await profileAPI.getByUserId(loggedInUser.id);

          loggedInUser.name = profile.display_name || loggedInUser.name;
          loggedInUser.phone = profile.phone;
          loggedInUser.display_name = profile.display_name;

          console.log("SignIn - updated loggedInUser:", loggedInUser);
        } catch (profileError) {
          console.warn("Could not fetch profile data:", profileError);
        }

        setStoredValue("authToken", token, rememberMe);
        setStoredValue("userRole", userRole, rememberMe);
        setStoredValue("userId", loggedInUser.id, rememberMe);
        setStoredValue("userEmail", email, rememberMe);

        if (loggedInUser.name) {
          setStoredValue("userName", loggedInUser.name, rememberMe);
        }
        if (loggedInUser.phone) {
          setStoredValue("userPhone", loggedInUser.phone, rememberMe);
        }
        if (loggedInUser.display_name) {
          setStoredValue("displayName", loggedInUser.display_name, rememberMe);
        }

        if (response.refresh_token) {
          setStoredValue("refreshToken", response.refresh_token, rememberMe);
        }

        setUser(loggedInUser);
        setToken(token);

        return { error: null, data: response };
      } else {
        console.error("Invalid response structure:", response);
        throw new Error(
          "Invalid login response - missing access_token or token"
        );
      }
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const currentToken = token || localStorage.getItem("authToken");
      if (currentToken) {
        try {
          await authAPI.logout({ token: currentToken });
        } catch (error) {
          console.warn("Backend logout failed:", error);
        }
      }

      clearAuthData();

      navigate("/");

      return { error: null };
    } catch (error) {
      console.error("Logout error:", error);
      return { error };
    }
  };

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
