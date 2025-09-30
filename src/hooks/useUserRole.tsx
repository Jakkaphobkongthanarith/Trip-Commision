import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user, userRole: authUserRole } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserRole("");
      setLoading(false);
      return;
    }

    // Use userRole from AuthContext (stored in session storage)
    if (authUserRole) {
      setUserRole(authUserRole);
      setLoading(false);
      return;
    }

    // Fallback: try to get from session storage directly
    try {
      const storedRole = sessionStorage.getItem("userRole");
      if (storedRole) {
        setUserRole(storedRole);
      } else {
        setUserRole("");
      }
    } catch (err) {
      console.error("Error getting user role from session storage:", err);
      setUserRole("");
    } finally {
      setLoading(false);
    }
  }, [user, authUserRole]);

  return { userRole, loading };
};
