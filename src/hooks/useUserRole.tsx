import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user, isAuthenticated } = useAuth();

  const userRole = user?.role || "";
  console.log("user", user);
  const loading = false;

  return {
    userRole,
    loading: !isAuthenticated,
  };
};
