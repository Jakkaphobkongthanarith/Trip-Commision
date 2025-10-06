import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
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
import { apiRequest } from "@/lib/api";
import { DollarSign, Calendar, Package, Phone, Mail, User } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Commission {
  id: string;
  booking_id: string;
  commission_amount: number;
  commission_percentage: number;
  status: string;
  created_at: string;
}

interface UpcomingTrip {
  id: string;
  package_id: string;
  booking_date: string;
  guest_count: number;
  status: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  special_requests?: string;
  total_amount: number;
  final_amount: number;
  travel_packages: {
    title: string;
    location: string;
  };
  profiles: {
    display_name: string;
  };
}

const AdvertiserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Early returns ต้องอยู่ก่อน hooks ทั้งหมด
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const [userRole, setUserRole] = useState<string>("");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [monthlyCommission, setMonthlyCommission] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      if (!user) return;
      setLoading(true);
      await Promise.allSettled([
        fetchUserRole(),
        fetchCommissions(),
        fetchUpcomingTrips(),
      ]);
      if (!isCancelled) setLoading(false);
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const roleData = sessionStorage.getItem("userRole");
      console.log("User role data:", roleData);

      if (roleData) {
        setUserRole(roleData as string);
      } else {
        setUserRole("");
      }
    } catch (e) {
      console.error("Error fetching user role:", e);
    }
  };

  const fetchCommissions = async () => {
    if (!user) return;

    try {
      const data = await apiRequest(
        `/api/commissions?advertiser_id=${user.id}&order=created_at.desc`
      );
      setCommissions(data);

      // Calculate monthly commission
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyTotal = data
        .filter((commission: any) => {
          const commissionDate = new Date(commission.created_at);
          return (
            commissionDate.getMonth() === currentMonth &&
            commissionDate.getFullYear() === currentYear &&
            commission.status === "paid"
          );
        })
        .reduce(
          (sum: number, commission: any) => sum + commission.commission_amount,
          0
        );

      setMonthlyCommission(monthlyTotal);
    } catch (error) {
      console.error("Error fetching commissions:", error);
    }
  };


  const fetchUpcomingTrips = async () => {
    const today = new Date().toISOString().split("T")[0];

    try {
      const data = await apiRequest(
        `/api/bookings?booking_date.gte=${today}&limit=10&order=booking_date.asc`
      );

      // Fetch related data separately
      const tripsWithDetails = await Promise.all(
        data.map(async (trip: any) => {
          const [packageData, profileData] = await Promise.all([
            apiRequest(`/api/packages/${trip.package_id}`),
            apiRequest(`/api/profiles/${trip.customer_id}`),
          ]);

          return {
            ...trip,
            travel_packages: {
              title: packageData.title,
              location: packageData.location,
            },
            profiles: { display_name: profileData.display_name },
          };
        })
      );

      setUpcomingTrips(
        tripsWithDetails.filter(
          (t) => t.travel_packages && t.profiles
        ) as UpcomingTrip[]
      );
    } catch (error) {
      console.error("Error fetching upcoming trips:", error);
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

  // Role check - redirect if not advertiser
  if (userRole && userRole !== "advertiser") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end">
      <Navbar />
      <div className="container mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">แดชบอร์ดคนกลาง</h1>
          <p className="text-white/80">ภาพรวมและสถิติของคุณ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                ค่าคอมมิชชั่นเดือนนี้
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{monthlyCommission.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                ทริปที่จะมาถึง
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingTrips.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                จำนวนแพคเกจทั้งหมด
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commissions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Trips - Full Width with Contact Info */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ทริปที่จะมาถึง</CardTitle>
            <CardDescription>รายการจองพร้อมข้อมูลติดต่อลูกค้า</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                ไม่มีทริปที่จะมาถึง
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {upcomingTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
                    onClick={() => navigate(`/package/${trip.package_id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {trip.travel_packages?.title}
                          </CardTitle>
                          <CardDescription>
                            {trip.travel_packages?.location}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            trip.status === "confirmed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {trip.status === "confirmed"
                            ? "ยืนยันแล้ว"
                            : "รอดำเนินการ"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">วันที่เดินทาง:</span>
                        <span className="font-medium">
                          {format(new Date(trip.booking_date), "d MMMM yyyy", { locale: th })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">จำนวนผู้เดินทาง:</span>
                        <span className="font-medium">{trip.guest_count} คน</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">ยอดรวม:</span>
                        <span className="font-medium text-primary">
                          ฿{trip.final_amount.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="border-t pt-3 mt-3 space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                          ข้อมูลติดต่อลูกค้า:
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{trip.contact_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${trip.contact_phone}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {trip.contact_phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${trip.contact_email}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {trip.contact_email}
                          </a>
                        </div>
                      </div>

                      {trip.special_requests && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm font-semibold text-muted-foreground mb-1">
                            คำขอพิเศษ:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {trip.special_requests}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission History */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ประวัติค่าคอมมิชชั่น</CardTitle>
            <CardDescription>รายการค่าคอมมิชชั่นที่ได้รับ</CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                ยังไม่มีข้อมูลค่าคอมมิชชั่น
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>จำนวนเงิน</TableHead>
                    <TableHead>เปอร์เซ็นต์</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.slice(0, 10).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {new Date(commission.created_at).toLocaleDateString(
                          "th-TH"
                        )}
                      </TableCell>
                      <TableCell>
                        ฿{commission.commission_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{commission.commission_percentage}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            commission.status === "paid"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {commission.status === "paid" ? "จ่ายแล้ว" : "รอจ่าย"}
                        </Badge>
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

export default AdvertiserDashboard;
