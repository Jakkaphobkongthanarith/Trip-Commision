import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

export const useUserRole = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole("");
        setLoading(false);
        return;
      }

      try {
        // เรียก backend API แทน Supabase RPC
        const roleData = await apiRequest("/api/user/current/role");
        console.log("User role:", roleData);

        if (roleData && roleData.role) {
          setUserRole(roleData.role as string);
        } else {
          setUserRole("");
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole("");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { userRole, loading };
};
