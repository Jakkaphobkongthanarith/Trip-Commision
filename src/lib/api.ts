import { supabase } from "@/integrations/supabase/client";

// API Base URL Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Helper function สำหรับเรียก API
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;

  let session = null;
  try {
    // Get current session to include auth token
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn("Session error:", error);
      // Try to refresh session if error
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.refreshSession();
      session = refreshedSession;
    } else {
      session = currentSession;
    }
  } catch (sessionError) {
    console.warn("Failed to get session:", sessionError);
    // Continue without auth token
  }

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      // Include authorization header if user is logged in and has valid token
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
      ...options.headers,
    },
    ...options,
  };

  console.log("Making API request:", url, defaultOptions);
  const response = await fetch(url, defaultOptions);
  console.log("API response:", response.status, response.statusText);

  // Handle 403 session errors specifically
  if (response.status === 403) {
    const errorData = await response.text();
    if (errorData.includes("session_not_found")) {
      // Don't call supabase.auth.signOut() here to avoid 403 errors
      // Let AuthContext handle session expiry with auto-redirect
      console.warn("Session expired detected, letting AuthContext handle it");
      throw new Error("Session expired. Please login again.");
    }
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }

  return response.json();
};

// Specific API functions
export const packageAPI = {
  getAll: () => apiRequest("/allPackages"),
  getById: (id: string) => apiRequest(`/package/${id}`),
  create: (packageData: any) =>
    apiRequest("/meow", {
      method: "POST",
      body: JSON.stringify(packageData),
    }),
};

export const profileAPI = {
  getAll: () => apiRequest("/api/profiles"),
  getByUserId: (userId: string) => apiRequest(`/api/profile/${userId}`),
};

export const authAPI = {
  signup: (data: any) =>
    apiRequest("/api/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: any) =>
    apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: (data: any) =>
    apiRequest("/api/logout", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
