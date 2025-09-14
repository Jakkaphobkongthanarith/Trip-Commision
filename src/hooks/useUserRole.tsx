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
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setUserRole(data.role);
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