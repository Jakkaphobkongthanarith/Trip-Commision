import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Search, Users, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  user_id: string;
  display_name: string;
  created_at: string;
  email: string;
  role: string;
}

const MemberManagement = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userRole === 'advertiser') {
      fetchMembers();
    }
  }, [user, userRole]);

  const fetchMembers = async () => {
    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        // Get user roles for each profile
        const membersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.user_id)
              .single();

            // Get email from auth metadata (simplified approach)
            return {
              ...profile,
              role: roleData?.role || 'customer',
              email: `user_${profile.user_id.slice(0, 8)}@example.com` // Placeholder since we can't access auth.users
            };
          })
        );

        setMembers(membersWithRoles);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'manager':
        return 'destructive';
      case 'advertiser':
        return 'default';
      case 'customer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'manager':
        return 'แอดมิน';
      case 'advertiser':
        return 'คนกลาง';
      case 'customer':
        return 'นักท่องเที่ยว';
      default:
        return role;
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'advertiser') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end pt-20">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">จัดการสมาชิก</h1>
          <p className="text-white/80">ดูและจัดการข้อมูลสมาชิกในระบบ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สมาชิกทั้งหมด</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">นักท่องเที่ยว</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.role === 'customer').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">คนกลาง</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.role === 'advertiser').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members Table */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>รายชื่อสมาชิก</CardTitle>
            <CardDescription>ข้อมูลสมาชิกที่ลงทะเบียนในระบบ</CardDescription>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">ไม่พบข้อมูลสมาชิก</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead>การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.display_name || 'ไม่ระบุชื่อ'}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberManagement;