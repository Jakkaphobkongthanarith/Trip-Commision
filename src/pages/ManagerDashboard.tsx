import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Settings,
  Code,
  FileText,
  ArrowRight,
  MapPin,
  Clock,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface DashboardStats {
  totalUsers: number;
  totalAdvertisers: number;
  totalPackages: number;
  activePackages: number;
  totalBookings: number;
  thisMonthBookings: number;
  totalRevenue: number;
}

interface RecentBooking {
  id: string;
  package_title: string;
  user_name: string;
  booking_date: string;
  total_price: number;
  status: string;
}

interface RecentPackage {
  id: string;
  title: string;
  location: string;
  price: number;
  created_at: string;
  advertiser_name: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdvertisers: 0,
    totalPackages: 0,
    activePackages: 0,
    totalBookings: 0,
    thisMonthBookings: 0,
    totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[] | null>(
    null
  );
  const [recentPackages, setRecentPackages] = useState<RecentPackage[] | null>(
    null
  );

  const quickActions: QuickAction[] = [
    {
      title: "จัดการโค้ดส่วนลด",
      description: "สร้างและจัดการโค้ดส่วนลดสำหรับแพคเกจ",
      icon: <Code className="h-6 w-6" />,
      href: "/discount-management",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "จัดการสมาชิก",
      description: "ดูและจัดการข้อมูลผู้ใช้และ Advertiser",
      icon: <Users className="h-6 w-6" />,
      href: "/members",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "จัดการแพคเกจ",
      description: "ดูและจัดการแพคเกจท่องเที่ยวทั้งหมด",
      icon: <Package className="h-6 w-6" />,
      href: "/package-management",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/manager/dashboard/stats`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({
        totalUsers: 156,
        totalAdvertisers: 23,
        totalPackages: 45,
        activePackages: 38,
        totalBookings: 234,
        thisMonthBookings: 47,
        totalRevenue: 125000,
      });
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/manager/recent-bookings`
      );
      if (response.ok) {
        const data = await response.json();
        setRecentBookings(data);
      }
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
      setRecentBookings([
        {
          id: "1",
          package_title: "เชียงใหม่ 3 วัน 2 คืน",
          user_name: "สมชาย ใจดี",
          booking_date: "2024-10-20",
          total_price: 4500,
          status: "confirmed",
        },
        {
          id: "2",
          package_title: "ภูเก็ต 4 วัน 3 คืน",
          user_name: "สมหญิง สวยงาม",
          booking_date: "2024-10-19",
          total_price: 8900,
          status: "pending",
        },
      ]);
    }
  };

  const fetchRecentPackages = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/manager/recent-packages`
      );
      if (response.ok) {
        const data = await response.json();
        setRecentPackages(data);
      }
    } catch (error) {
      console.error("Error fetching recent packages:", error);
      setRecentPackages([
        {
          id: "1",
          title: "หาดใหญ่ สุดยอดอาหารใต้",
          location: "สงขลา",
          price: 2500,
          created_at: "2024-10-20",
          advertiser_name: "บริษัท ทัวร์ใต้",
        },
        {
          id: "2",
          title: "น่าน เมืองโบราณ",
          location: "น่าน",
          price: 3200,
          created_at: "2024-10-19",
          advertiser_name: "น่านทราเวล",
        },
      ]);
    }
  };

  useEffect(() => {
    if (user) {
      setUserRole(user.role || "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (userRole === "manager") {
      fetchStats();
      fetchRecentBookings();
      fetchRecentPackages();
    }
  }, [userRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== "manager") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
              <p className="text-sm text-gray-500">
                เฉพาะ Manager เท่านั้นที่สามารถเข้าถึงได้
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manager Dashboard
          </h1>
          <p className="text-gray-600">
            ภาพรวมระบบและการจัดการแพลตฟอร์ม Trip Trader
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    ผู้ใช้ทั้งหมด
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Packages */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    แพคเกจทั้งหมด
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalPackages}
                  </p>
                  <p className="text-xs text-green-600">
                    ใช้งาน {stats.activePackages} แพคเกจ
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month Bookings */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    การจองเดือนนี้
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.thisMonthBookings}
                  </p>
                  <p className="text-xs text-gray-500">
                    รวม {stats.totalBookings} การจอง
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">รายได้รวม</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ฿{stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/95 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              การดำเนินการด่วน
            </CardTitle>
            <CardDescription>
              เข้าถึงเครื่องมือจัดการสำคัญได้อย่างรวดเร็ว
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 bg-gradient-to-r from-gray-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex items-center mb-3">
                        <div
                          className={`p-2 rounded-lg ${action.color} text-white mr-3`}
                        >
                          {action.icon}
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Bookings */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                การจองล่าสุด
              </CardTitle>
              <CardDescription>การจองที่เกิดขึ้นล่าสุด</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(recentBookings) && recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">ยังไม่มีการจอง</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(recentBookings) ? recentBookings : []).map(
                    (booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.package_title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.user_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.booking_date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ฿{booking.total_price.toLocaleString()}
                          </p>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {booking.status === "confirmed"
                              ? "ยืนยันแล้ว"
                              : "รอดำเนินการ"}
                          </Badge>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Packages */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                แพคเกจใหม่ล่าสุด
              </CardTitle>
              <CardDescription>แพคเกจที่เพิ่งถูกสร้างขึ้น</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(recentPackages) && recentPackages.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">ยังไม่มีแพคเกจใหม่</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(recentPackages) ? recentPackages : []).map(
                    (pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {pkg.title}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {pkg.location}
                          </p>
                          <p className="text-xs text-gray-500">
                            {pkg.advertiser_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ฿{pkg.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {pkg.created_at}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
