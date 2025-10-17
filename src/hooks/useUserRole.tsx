import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user, isAuthenticated } = useAuth();

  // ✅ ใช้ข้อมูลจาก AuthContext โดยตรง - ไม่ต้องมี state เพิ่มเติม
  const userRole = user?.role || "";
  const loading = false; // ไม่ต้อง loading เพราะข้อมูลมาจาก AuthContext แล้ว

  return {
    userRole,
    loading: !isAuthenticated, // loading = true เมื่อยังไม่ได้ authentication
  };
};
