export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const getAuthToken = (): string | null => {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
};

export const getUserId = (): string | null => {
  return localStorage.getItem("userId") || sessionStorage.getItem("userId");
};

export const getUserEmail = (): string | null => {
  return (
    localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail")
  );
};

export const getUserRole = (): string | null => {
  return localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
};

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
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

  if (response.status === 401) {
    console.warn("Token expired, clearing auth data");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    sessionStorage.removeItem("userRole");
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }

  return response.json();
};

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

  getAll: () => apiRequest("/api/bookings"),

  getByPackageId: (packageId: string) =>
    apiRequest(`/api/bookings?package_id=${packageId}`),

  getByPackage: (packageId: string) =>
    apiRequest(`/api/bookings/package/${packageId}`),

  confirmPayment: (bookingId: string) =>
    apiRequest(`/api/booking/${bookingId}/confirm-payment`, {
      method: "PUT",
    }),

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
  getAllDiscountCodes: () => apiRequest("/api/manager/discount-codes"),
  getAllAdvertisers: () => apiRequest("/api/manager/advertisers"),
  getAllPackages: () => apiRequest("/api/manager/packages"),

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

  getAllGlobalCodes: () => apiRequest("/api/manager/global-discount-codes"),

  toggleStatus: (id: string, isActive: boolean) =>
    apiRequest(`/api/discount-codes/${id}/toggle`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    }),

  toggleGlobalStatus: (id: string, isActive: boolean) =>
    apiRequest(`/api/global-discount-codes/${id}/toggle`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    }),

  delete: (id: string) =>
    apiRequest(`/api/discount-codes/${id}`, {
      method: "DELETE",
    }),

  deleteGlobal: (id: string) =>
    apiRequest(`/api/global-discount-codes/${id}`, {
      method: "DELETE",
    }),

  getByAdvertiser: (advertiserId: string) =>
    apiRequest(`/api/advertiser/${advertiserId}/discount-codes`),

  getCommissionsByAdvertiser: (advertiserId: string) =>
    apiRequest(`/api/advertiser/${advertiserId}/commissions`),

  validate: (code: string, packageId: string) =>
    apiRequest("/api/discount-codes/validate", {
      method: "POST",
      body: JSON.stringify({ code, package_id: packageId }),
    }),
};
