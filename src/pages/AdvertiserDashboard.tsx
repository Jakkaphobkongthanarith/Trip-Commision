import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface DiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  max_uses: number;
  current_uses: number;
  usage_percentage: number;
  commission_rate: number;
  tier: string;
  is_active: boolean;
  expires_at?: string;
}
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
import {
  DollarSign,
  Star,
  Calendar,
  TrendingUp,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

interface DiscountCommission {
  id: string;
  advertiser_id: string;
  booking_id: string;
  commission_amount: number;
  commission_percentage: number;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  travel_packages: {
    title: string;
  };
  profiles: {
    display_name: string;
  };
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
  travel_packages?: {
    title: string;
    location: string;
  };
  TravelPackages?: {
    title: string;
    location: string;
  };
  profiles?: {
    display_name: string;
  };
  Profile?: {
    display_name: string;
  };
  profile?: {
    display_name: string;
  };
}

const AdvertiserDashboard = () => {
  const { user } = useAuth();
  console.log("Current user in AdvertiserDashboard:", user);

  // Early returns ต้องอยู่ก่อน hooks ทั้งหมด
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>("");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [discountCommissions, setDiscountCommissions] = useState<
    DiscountCommission[]
  >([]);
  const [monthlyCommission, setMonthlyCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPackageBookings, setSelectedPackageBookings] = useState<
    UpcomingTrip[] | null
  >(null);
  const [selectedPackageInfo, setSelectedPackageInfo] = useState<{
    title: string;
    location: string;
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      if (!user) return;
      setLoading(true);
      await Promise.allSettled([
        fetchUserRole(),
        fetchCommissions(),
        fetchReviews(),
        fetchUpcomingTrips(),
        fetchDiscountCodes(),
        fetchDiscountCommissions(),
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
        console.log("Setting user role:", roleData);
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
      // สำหรับ customer ไม่ต้องดึงข้อมูล commission
      if (userRole === "customer") {
        setCommissions([]);
        setMonthlyCommission(0);
        return;
      }

      const data = await apiRequest(`/api/commissions`);

      // ตรวจสอบว่า data เป็น array หรือไม่
      const commissionsArray = Array.isArray(data)
        ? data
        : data?.commissions || [];

      if (!Array.isArray(commissionsArray)) {
        console.log("Invalid commissions data format:", data);
        setCommissions([]);
        setMonthlyCommission(0);
        return;
      }

      setCommissions(commissionsArray);

      // Calculate monthly commission
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyTotal = commissionsArray
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
      setCommissions([]);
      setMonthlyCommission(0);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await apiRequest("/api/reviews");

      // ตรวจสอบว่า data เป็น array หรือไม่
      const reviewsArray = Array.isArray(data) ? data : data?.reviews || [];

      if (!Array.isArray(reviewsArray) || reviewsArray.length === 0) {
        console.log("No reviews data or invalid format:", data);
        setReviews([]);
        return;
      }

      // Fetch related data separately
      const reviewsWithDetails = await Promise.all(
        reviewsArray.map(async (review: any) => {
          try {
            const [packageData, profileData] = await Promise.all([
              apiRequest(`/package/${review.package_id}`),
              apiRequest(`/api/profile/${review.customer_id}`),
            ]);

            return {
              ...review,
              travel_packages: { title: packageData?.title || "ไม่ระบุ" },
              profiles: {
                display_name: profileData?.display_name || "ไม่ระบุ",
              },
            };
          } catch (error) {
            console.error(
              `Error fetching details for review ${review.id}:`,
              error
            );
            return {
              ...review,
              travel_packages: { title: "ไม่ระบุ" },
              profiles: { display_name: "ไม่ระบุ" },
            };
          }
        })
      );

      setReviews(reviewsWithDetails as Review[]);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    }
  };

  const fetchDiscountCodes = async () => {
    if (!user || userRole !== "advertiser") return;

    try {
      const data = await apiRequest(
        `/api/advertiser/${user.id}/discount-codes`
      );
      setDiscountCodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      setDiscountCodes([]);
    }
  };

  const fetchDiscountCommissions = async () => {
    if (!user || userRole !== "advertiser") return;

    try {
      const data = await apiRequest(`/api/advertiser/${user.id}/commissions`);
      setDiscountCommissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching discount commissions:", error);
      setDiscountCommissions([]);
    }
  };

  const fetchUpcomingTrips = async () => {
    try {
      const data = await apiRequest(`/api/bookings`);

      // ตรวจสอบว่า data เป็น array หรือไม่
      const bookingsArray = Array.isArray(data) ? data : data?.bookings || [];

      if (!Array.isArray(bookingsArray) || bookingsArray.length === 0) {
        console.log("No upcoming trips data or invalid format:", data);
        setUpcomingTrips([]);
        return;
      }

      // ใช้ข้อมูลจาก /api/bookings โดยตรง เพราะเราจะดึงรายละเอียดครบใน Modal แล้ว
      const processedTrips = bookingsArray.map((trip: any) => ({
        ...trip,
        travel_packages: {
          title: "แพคเกจ ID: " + trip.package_id?.substring(0, 8) + "...",
          location: "คลิกเพื่อดูรายละเอียด",
        },
        profiles: {
          display_name: "ผู้จอง",
        },
      }));

      setUpcomingTrips(processedTrips);
    } catch (error) {
      console.error("Error fetching upcoming trips:", error);
      setUpcomingTrips([]);
    }
  };

  // Group bookings by package
  const groupedPackages = upcomingTrips.reduce((acc: any, trip) => {
    const packageTitle = trip.travel_packages?.title || "ไม่ระบุ";
    const packageLocation = trip.travel_packages?.location || "ไม่ระบุ";

    if (!acc[packageTitle]) {
      acc[packageTitle] = {
        title: packageTitle,
        location: packageLocation,
        package_id: trip.package_id,
        bookings: [],
      };
    }
    acc[packageTitle].bookings.push(trip);
    return acc;
  }, {});

  const packageList = Object.values(groupedPackages);

  const handlePackageClick = async (packageInfo: any) => {
    try {
      // เรียก API เส้นใหม่เพื่อดึงรายชื่อผู้จองที่ confirmed แล้ว พร้อมข้อมูลครบถ้วน
      const confirmedBookings = await apiRequest(
        `/package/userList/${packageInfo.package_id}`
      );

      // ข้อมูลจาก API ใหม่จะมีข้อมูล TravelPackage และ Profile ครบแล้ว
      setSelectedPackageBookings(confirmedBookings);

      // ใช้ข้อมูลจาก booking แรกเพื่อแสดงชื่อแพคเกจ
      const packageTitle =
        confirmedBookings[0]?.TravelPackages?.title ||
        confirmedBookings[0]?.travel_packages?.title ||
        packageInfo.title;
      const packageLocation =
        confirmedBookings[0]?.TravelPackages?.location ||
        confirmedBookings[0]?.travel_packages?.location ||
        packageInfo.location;

      setSelectedPackageInfo({
        title: packageTitle,
        location: packageLocation,
      });
    } catch (error) {
      console.error("Error fetching confirmed bookings:", error);
      setSelectedPackageBookings([]);
      setSelectedPackageInfo({
        title: packageInfo.title,
        location: packageInfo.location,
      });
    }
  };

  // Loading state
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Role check - allow both advertiser and customer to access
  if (userRole !== "advertiser" && userRole !== "customer") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end">
      <Navbar />
      <div className="container mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {userRole === "customer"
              ? "แดชบอร์ดนักท่องเที่ยว"
              : "แดชบอร์ดคนกลาง"}
          </h1>
          <p className="text-white/80">
            {userRole === "customer"
              ? "ข้อมูลการเดินทางและรีวิวของคุณ"
              : "ภาพรวมและสถิติของคุณ"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {userRole === "advertiser" && (
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
          )}

          {userRole === "customer" && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  การจองทั้งหมด
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingTrips.length}</div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userRole === "customer" ? "ทริปที่จะมาถึง" : "ทริปที่จะมาถึง"}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingTrips.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Trips */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>แพคเกจที่มีการจอง</CardTitle>
            <CardDescription>
              คลิกเพื่อดูรายชื่อผู้จองและข้อมูลติดต่อ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {packageList.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                ไม่มีแพคเกจที่มีการจอง
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อแพคเกจ</TableHead>
                    <TableHead>สถานที่</TableHead>
                    <TableHead>จำนวนการจอง</TableHead>
                    <TableHead>รวมผู้เข้าร่วม</TableHead>
                    <TableHead>การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packageList.map((packageInfo: any, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{packageInfo.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {packageInfo.location}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {packageInfo.bookings.length} รายการ
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {packageInfo.bookings.reduce(
                          (total: number, booking: any) =>
                            total + booking.guest_count,
                          0
                        )}{" "}
                        คน
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePackageClick(packageInfo)}
                        >
                          ดูรายชื่อผู้จอง
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Package Bookings Modal */}
        <Dialog
          open={!!selectedPackageBookings}
          onOpenChange={() => {
            setSelectedPackageBookings(null);
            setSelectedPackageInfo(null);
          }}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                รายชื่อผู้จอง: {selectedPackageInfo?.title}
              </DialogTitle>
              <DialogDescription>
                สถานที่: {selectedPackageInfo?.location}
              </DialogDescription>
            </DialogHeader>

            {selectedPackageBookings && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border">
                    <p className="text-sm text-blue-600 mb-1">จำนวนการจอง</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {selectedPackageBookings.length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border">
                    <p className="text-sm text-green-600 mb-1">
                      รวมผู้เข้าร่วม
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {selectedPackageBookings.reduce(
                        (total, booking) => total + booking.guest_count,
                        0
                      )}{" "}
                      คน
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg border">
                    <p className="text-sm text-amber-600 mb-1">รายได้รวม</p>
                    <p className="text-2xl font-bold text-amber-700">
                      ฿
                      {selectedPackageBookings
                        .reduce(
                          (total, booking) =>
                            total + (booking.final_amount || 0),
                          0
                        )
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border">
                    <p className="text-sm text-purple-600 mb-1">การจองยืนยัน</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {selectedPackageBookings.length}
                    </p>
                  </div>
                </div>

                {/* Bookings List */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อผู้จอง</TableHead>
                        <TableHead>วันที่เดินทาง</TableHead>
                        <TableHead>จำนวนคน</TableHead>
                        <TableHead>เบอร์โทร</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead>ยอดชำระ</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPackageBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {booking.contact_name}
                              </p>
                              {(booking.Profile?.display_name ||
                                booking.profile?.display_name) && (
                                <p className="text-sm text-muted-foreground">
                                  (
                                  {booking.Profile?.display_name ||
                                    booking.profile?.display_name}
                                  )
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(booking.booking_date),
                              "dd/MM/yyyy",
                              {
                                locale: th,
                              }
                            )}
                          </TableCell>
                          <TableCell>{booking.guest_count} คน</TableCell>
                          <TableCell>
                            <a
                              href={`tel:${booking.contact_phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {booking.contact_phone}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${booking.contact_email}`}
                              className="text-blue-600 hover:underline break-all"
                            >
                              {booking.contact_email}
                            </a>
                          </TableCell>
                          <TableCell>
                            ฿{booking.final_amount?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === "confirmed"
                                  ? "default"
                                  : booking.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {booking.status === "confirmed"
                                ? "ยืนยันแล้ว"
                                : booking.status === "pending"
                                ? "รอยืนยัน"
                                : "ยกเลิก"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Special Requests Summary */}
                {selectedPackageBookings.some(
                  (booking) => booking.special_requests
                ) && (
                  <div className="border rounded-lg p-4 bg-purple-50">
                    <h3 className="font-semibold mb-3 text-purple-800">
                      คำขอพิเศษ
                    </h3>
                    <div className="space-y-3">
                      {selectedPackageBookings
                        .filter((booking) => booking.special_requests)
                        .map((booking) => (
                          <div
                            key={booking.id}
                            className="bg-white p-3 rounded border"
                          >
                            <p className="font-medium text-sm mb-1">
                              {booking.contact_name}:
                            </p>
                            <p className="text-sm text-gray-600">
                              {booking.special_requests}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      if (selectedPackageBookings[0]?.package_id) {
                        navigate(
                          `/packages/${selectedPackageBookings[0].package_id}`
                        );
                      }
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    ดูรายละเอียดแพคเกจ
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedPackageBookings(null);
                      setSelectedPackageInfo(null);
                    }}
                    variant="default"
                    className="flex-1"
                  >
                    ปิด
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Commission History - Only for advertisers */}
        {userRole === "advertiser" && (
          <>
            {/* Promo Codes Section */}
            <Card className="mt-6 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>โค้ดส่วนลดของคุณ</CardTitle>
                <CardDescription>
                  โค้ดส่วนลดที่สร้างสำหรับแพคเกจของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discountCodes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    ยังไม่มีโค้ดส่วนลด
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>โค้ด</TableHead>
                        <TableHead>ส่วนลด</TableHead>
                        <TableHead>การใช้งาน</TableHead>
                        <TableHead>เปอร์เซ็นต์การใช้</TableHead>
                        <TableHead>ค่าคอมมิชชั่น</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>หมดอายุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discountCodes.map((discountCode) => (
                        <TableRow key={discountCode.id}>
                          <TableCell className="font-mono font-bold">
                            {discountCode.code}
                          </TableCell>
                          <TableCell>
                            {discountCode.discount_percentage}%
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {discountCode.current_uses}/
                                {discountCode.max_uses}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${discountCode.usage_percentage}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {discountCode.usage_percentage.toFixed(1)}%
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                discountCode.commission_rate > 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {discountCode.commission_rate}% (
                              {discountCode.tier})
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                discountCode.is_active
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {discountCode.is_active
                                ? "ใช้งานได้"
                                : "ปิดใช้งาน"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {discountCode.expires_at
                              ? new Date(
                                  discountCode.expires_at
                                ).toLocaleDateString("th-TH")
                              : "ไม่หมดอายุ"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Promo Commission History */}
            <Card className="mt-6 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>ค่าคอมมิชชั่นจากโค้ดส่วนลด</CardTitle>
                <CardDescription>
                  รายการค่าคอมมิชชั่นจากการใช้โค้ดส่วนลด
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discountCommissions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    ยังไม่มีค่าคอมมิชชั่นจากโค้ดส่วนลด
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>อัตราคอมมิชชั่น</TableHead>
                        <TableHead>จำนวนเงิน</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discountCommissions.slice(0, 10).map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {new Date(commission.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {commission.booking_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {commission.commission_percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              ฿{commission.commission_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                commission.status === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {commission.status === "paid"
                                ? "จ่ายแล้ว"
                                : "รอดำเนินการ"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Regular Commission History */}
            <Card className="mt-6 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>ประวัติค่าคอมมิชชั่นทั่วไป</CardTitle>
                <CardDescription>
                  รายการค่าคอมมิชชั่นจากการจองปกติ
                </CardDescription>
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
                          <TableCell>
                            {commission.commission_percentage}%
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                commission.status === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {commission.status === "paid"
                                ? "จ่ายแล้ว"
                                : "รอจ่าย"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvertiserDashboard;
