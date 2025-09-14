import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole('');
        setLoading(false);
        return;
      }

      try {
        // Prefer RPC to avoid RLS issues and missing-row errors
        const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
        if (!roleError && roleData) {
          setUserRole(roleData as string);
          return;
        }

        // Fallback to direct table query
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data?.role) {
          setUserRole(data.role as string);
        } else {
          setUserRole('');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { userRole, loading };
};