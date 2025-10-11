// API Base URL Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Helper function สำหรับเรียก API (JWT Version)
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get JWT token from localStorage
  const token = localStorage.getItem("authToken");

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      // Include authorization header if token exists
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
      ...options.headers,
    },
    ...options,
  };

  console.log("Making API request:", url, defaultOptions);
  const response = await fetch(url, defaultOptions);
  console.log("API response:", response.status, response.statusText);

  // Handle 401 unauthorized (token expired)
  if (response.status === 401) {
    console.warn("Token expired, clearing auth data");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    sessionStorage.removeItem("userRole");
    // Redirect to login will be handled by AuthContext
    throw new Error("Session expired. Please login again.");
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
  updateCurrentBookings: (id: string, guestCount: number) =>
    apiRequest(`/package/${id}/bookings`, {
      method: "PUT",
      body: JSON.stringify({ guest_count: guestCount }),
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
  // New JWT methods
  verifyToken: (token: string) =>
    apiRequest("/api/verify-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  refreshToken: (refreshToken: string) =>
    apiRequest("/api/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

export const bookingAPI = {
  createPayment: (data: any) =>
    apiRequest("/api/booking/payment", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ดึง bookings ทั้งหมด
  getAll: () => apiRequest("/api/bookings"),

  // ดึง bookings ตาม package ID
  getByPackageId: (packageId: string) =>
    apiRequest(`/api/bookings?package_id=${packageId}`),

  // ดึง bookings ตาม package ID (alternative route)
  getByPackage: (packageId: string) =>
    apiRequest(`/api/bookings/package/${packageId}`),

  // ยืนยันการชำระเงิน - try multiple endpoints
  confirmPayment: (bookingId: string) =>
    apiRequest(`/api/bookings/${bookingId}/confirm`, {
      method: "PUT",
    }),

  // Alternative endpoint formats
  confirmPaymentAlt1: (bookingId: string) =>
    apiRequest(`/api/booking/${bookingId}/confirm`, {
      method: "PUT",
    }),

  confirmPaymentAlt2: (bookingId: string) =>
    apiRequest(`/api/bookings/${bookingId}/confirm-payment`, {
      method: "PUT",
    }),
};
