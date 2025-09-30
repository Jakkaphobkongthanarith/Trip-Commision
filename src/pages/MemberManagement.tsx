import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Search, Users, UserCheck, UserX, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

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
  const { userRole, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Early returns ต้องอยู่ก่อน hooks ทั้งหมด
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== "advertiser" && userRole !== "manager") {
    return <Navigate to="/" replace />;
  }

  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetailsOpen, setMemberDetailsOpen] = useState(false);

  useEffect(() => {
    if (user && (userRole === "advertiser" || userRole === "manager")) {
      fetchMembers();
    }
  }, [user, userRole]);

  const fetchMembers = async () => {
    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        // Get user roles for each profile
        const membersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.user_id)
              .single();

            // Get email from auth metadata (simplified approach)
            return {
              ...profile,
              role: roleData?.role || "customer",
              email: `user_${profile.user_id.slice(0, 8)}@example.com`, // Placeholder since we can't access auth.users
            };
          })
        );

        setMembers(membersWithRoles);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (userId: string, displayName: string) => {
    try {
      // Only allow deleting advertiser role
      const memberToDelete = members.find((m) => m.user_id === userId);
      if (memberToDelete?.role !== "advertiser") {
        toast({
          title: "ข้อผิดพลาด",
          description: "สามารถลบเฉพาะบัญชี 'คนกลาง' เท่านั้น",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (error) {
        console.error("Error deleting member:", error);
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถลบสมาชิกได้",
          variant: "destructive",
        });
      } else {
        setMembers(members.filter((m) => m.user_id !== userId));
        toast({
          title: "สำเร็จ",
          description: `ลบบัญชี ${displayName} เรียบร้อยแล้ว`,
        });
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในระบบ",
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "manager":
        return "destructive";
      case "advertiser":
        return "default";
      case "customer":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager":
        return "แอดมิน";
      case "advertiser":
        return "คนกลาง";
      case "customer":
        return "นักท่องเที่ยว";
      default:
        return role;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end">
      <Navbar />
      <div className="container mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">จัดการสมาชิก</h1>
          <p className="text-white/80">ดูและจัดการข้อมูลสมาชิกในระบบ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                สมาชิกทั้งหมด
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                นักท่องเที่ยว
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter((m) => m.role === "customer").length}
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
                {members.filter((m) => m.role === "advertiser").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members Table */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>รายชื่อสมาชิก</CardTitle>
            <CardDescription>ข้อมูลสมาชิกที่ลงทะเบียนในระบบ</CardDescription>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="กรองตามบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="customer">นักท่องเที่ยว</SelectItem>
                  <SelectItem value="advertiser">คนกลาง</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                ไม่พบข้อมูลสมาชิก
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    {userRole === "manager" && <TableHead>การจัดการ</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.display_name || "ไม่ระบุชื่อ"}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString(
                          "th-TH"
                        )}
                      </TableCell>
                      {userRole === "manager" && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(member);
                                setMemberDetailsOpen(true);
                              }}
                            >
                              ดูรายละเอียด
                            </Button>
                            {member.role === "advertiser" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    ลบ
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      ยืนยันการลบบัญชี
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      คุณแน่ใจหรือไม่ที่จะลบบัญชี "
                                      {member.display_name || member.email}"
                                      การกระทำนี้ไม่สามารถย้อนกลับได้
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      ยกเลิก
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteMember(
                                          member.user_id,
                                          member.display_name ||
                                            member.email ||
                                            "ผู้ใช้"
                                        )
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      ลบบัญชี
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Member Details Dialog */}
        <Dialog open={memberDetailsOpen} onOpenChange={setMemberDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>รายละเอียดสมาชิก</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      ชื่อผู้ใช้
                    </label>
                    <p className="text-sm">
                      {selectedMember.display_name || "ไม่ระบุชื่อ"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      อีเมล
                    </label>
                    <p className="text-sm">{selectedMember.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      ตำแหน่ง
                    </label>
                    <Badge
                      variant={getRoleBadgeVariant(selectedMember.role)}
                      className="mt-1"
                    >
                      {getRoleLabel(selectedMember.role)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      วันที่สมัคร
                    </label>
                    <p className="text-sm">
                      {new Date(selectedMember.created_at).toLocaleDateString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        }
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ID ผู้ใช้
                  </label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedMember.user_id}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MemberManagement;
