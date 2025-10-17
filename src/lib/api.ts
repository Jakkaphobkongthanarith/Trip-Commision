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
  update: (userId: string, profileData: any) =>
    apiRequest(`/api/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),
};

export const userAPI = {
  getAll: () => apiRequest("/api/users"),
  updateRole: (userId: string, role: string) =>
    apiRequest(`/api/user/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
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
    apiRequest(`/api/booking/${bookingId}/confirm-payment`, {
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

export const discountCodeAPI = {
  // Manager APIs - จัดการ discount codes
  getAllDiscountCodes: () => apiRequest("/api/manager/discount-codes"),
  getAllAdvertisers: () => apiRequest("/api/manager/advertisers"),
  getAllPackages: () => apiRequest("/api/manager/packages"),

  // สร้างโค้ดส่วนลดสำหรับ advertiser เฉพาะ
  createForAdvertiser: (data: {
    package_id: string;
    advertiser_id: string;
    discount_value: number;
    discount_type: "percentage" | "fixed";
  }) =>
    apiRequest("/api/discount-codes/advertiser", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // สร้างโค้ดส่วนลดทั่วไป
  createGlobal: (data: {
    discount_value: number;
    discount_type: "percentage" | "fixed";
    max_uses?: number;
    expires_at?: string;
  }) =>
    apiRequest("/api/global-discount-codes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ดึงโค้ดส่วนลดทั่วไป
  getAllGlobalCodes: () => apiRequest("/api/manager/global-discount-codes"),

  // เปิด/ปิดสถานะโค้ดส่วนลด
  toggleStatus: (id: string, isActive: boolean) =>
    apiRequest(`/api/discount-codes/${id}/toggle`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    }),

  // เปิด/ปิดสถานะโค้ดส่วนลดทั่วไป
  toggleGlobalStatus: (id: string, isActive: boolean) =>
    apiRequest(`/api/global-discount-codes/${id}/toggle`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    }),

  // ลบโค้ดส่วนลด
  delete: (id: string) =>
    apiRequest(`/api/discount-codes/${id}`, {
      method: "DELETE",
    }),

  // ลบโค้ดส่วนลดทั่วไป
  deleteGlobal: (id: string) =>
    apiRequest(`/api/global-discount-codes/${id}`, {
      method: "DELETE",
    }),

  // Advertiser APIs - ดูโค้ดของตัวเอง
  getByAdvertiser: (advertiserId: string) =>
    apiRequest(`/api/advertiser/${advertiserId}/discount-codes`),

  // ดูค่าคอมมิชชั่น
  getCommissionsByAdvertiser: (advertiserId: string) =>
    apiRequest(`/api/advertiser/${advertiserId}/commissions`),

  // Public API - ตรวจสอบความถูกต้องของโค้ด
  validate: (code: string, packageId: string) =>
    apiRequest("/api/discount-codes/validate", {
      method: "POST",
      body: JSON.stringify({ code, package_id: packageId }),
    }),
};
