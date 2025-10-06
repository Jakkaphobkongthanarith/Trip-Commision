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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  discount_amount?: number;
  discount_code?: string;
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
  const [selectedTrip, setSelectedTrip] = useState<UpcomingTrip | null>(null);

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
          const fetchPromises = [
            apiRequest(`/api/packages/${trip.package_id}`),
            apiRequest(`/api/profiles/${trip.customer_id}`),
          ];

          // Fetch discount code if exists
          if (trip.discount_code_id) {
            fetchPromises.push(apiRequest(`/api/discount_codes/${trip.discount_code_id}`));
          }

          const results = await Promise.all(fetchPromises);
          const packageData = results[0];
          const profileData = results[1];
          const discountData = results[2];

          return {
            ...trip,
            discount_code: discountData?.code,
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

        {/* Upcoming Trips */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ทริปที่จะมาถึง</CardTitle>
            <CardDescription>คลิกเพื่อดูรายละเอียดผู้จองและข้อมูลติดต่อ</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                ไม่มีทริปที่จะมาถึง
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
                    onClick={() => setSelectedTrip(trip)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">
                          {trip.travel_packages?.title}
                        </CardTitle>
                        <Badge
                          variant={
                            trip.status === "confirmed"
                              ? "default"
                              : "secondary"
                          }
                          className="shrink-0"
                        >
                          {trip.status === "confirmed" ? "ยืนยัน" : "รอ"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">วันที่:</span>
                        <span className="font-medium">
                          {format(new Date(trip.booking_date), "d MMM yyyy", { locale: th })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">ผู้เดินทาง:</span>
                        <span className="font-medium">{trip.guest_count} คน</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">ยอดชำระ:</span>
                        <span className="font-medium text-primary">
                          ฿{trip.final_amount.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trip Details Modal */}
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedTrip?.travel_packages?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedTrip?.travel_packages?.location}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTrip && (
              <div className="space-y-4">
                {/* Booking Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">วันที่เดินทาง</p>
                    <p className="font-medium">
                      {format(new Date(selectedTrip.booking_date), "d MMMM yyyy", { locale: th })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">จำนวนผู้เดินทาง</p>
                    <p className="font-medium">{selectedTrip.guest_count} คน</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">สถานะ</p>
                    <Badge variant={selectedTrip.status === "confirmed" ? "default" : "secondary"}>
                      {selectedTrip.status === "confirmed" ? "ยืนยันแล้ว" : "รอดำเนินการ"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ยอดชำระ</p>
                    <p className="font-bold text-primary">
                      ฿{selectedTrip.final_amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Discount Info */}
                {selectedTrip.discount_code && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                      ใช้โค้ดส่วนลด
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-green-700 dark:text-green-300">
                          {selectedTrip.discount_code}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ส่วนลด: ฿{selectedTrip.discount_amount?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">ราคาเต็ม</p>
                        <p className="line-through text-muted-foreground">
                          ฿{selectedTrip.total_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Contact */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-3">ข้อมูลติดต่อลูกค้า</p>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">ชื่อผู้จอง</p>
                      <p className="font-medium">{selectedTrip.contact_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">เบอร์โทรศัพท์</p>
                      <a
                        href={`tel:${selectedTrip.contact_phone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {selectedTrip.contact_phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">อีเมล</p>
                      <a
                        href={`mailto:${selectedTrip.contact_email}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {selectedTrip.contact_email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {selectedTrip.special_requests && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="font-semibold mb-2">คำขอพิเศษ</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTrip.special_requests}
                    </p>
                  </div>
                )}

                {/* View Package Button */}
                <Button
                  onClick={() => {
                    navigate(`/package/${selectedTrip.package_id}`);
                    setSelectedTrip(null);
                  }}
                  className="w-full"
                >
                  ดูรายละเอียดแพคเกจ
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
