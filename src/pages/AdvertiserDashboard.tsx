// ...existing imports...

// Place this inside the AdvertiserDashboard component, after all hooks and functions are defined
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiscountCode {
  id: string;
  code: string;
  discount_value: number;
  discount_type: string;
  max_uses: number;
  current_uses: number;
  usage_percentage: number;
  commission_rate: number;
  tier: string;
  is_active: boolean;
  expires_at?: string;
  package_id?: string;
  package_name?: string;
  package?: {
    max_guests: number;
    title: string;
  };
}

interface PackageCommissionData {
  package_id: string;
  package_name: string;
  usage_rate: number;
  current_uses: number;
  max_uses: number;
  commission_rate: number;
  total_revenue: number;
  commission_amount: number;
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  package_id: string;
  package_name: string;
  total_revenue: number;
  discount_code_id: string;
  discount_code: string;
  usage_percentage: number;
  commission_rate: number;
  commission_amount: number;
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
  const { t } = useLanguage();
  console.log("Current user in AdvertiserDashboard:", user);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>("");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
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

  const [discountSelectedMonth, setDiscountSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [discountSelectedYear, setDiscountSelectedYear] = useState(
    new Date().getFullYear()
  );

  useEffect(() => {
    let isCancelled = false;
    console.log("userr ->", user);
    const run = async () => {
      if (!user) return;
      setLoading(true);

      await fetchUserRole();

      await Promise.allSettled([fetchCommissions(), fetchUpcomingTrips()]);

      if (!isCancelled) setLoading(false);
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !userRole) return;

    const fetchRoleData = async () => {
      await Promise.allSettled([
        fetchDiscountCodes(),
        fetchDiscountCommissions(),
      ]);
    };

    fetchRoleData();
  }, [user, userRole, discountSelectedMonth, discountSelectedYear]);

  useEffect(() => {
    if (!user || userRole !== "advertiser") return;
    setLoading(true);
    fetchUpcomingTrips().finally(() => setLoading(false));
  }, [user, userRole]);

  // Prevent fetchUpcomingTrips from being called if userRole is not 'advertiser'
  // (already handled above, but clarify intent)

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      console.log("User role from AuthContext:", user.role);
      setUserRole(user.role || "");
    } catch (e) {
      console.error("Error fetching user role:", e);
    }
  };

  const fetchCommissions = async () => {
    if (!user) return;

    try {
      if (userRole === "customer") {
        setCommissions([]);
        setMonthlyCommission(0);
        return;
      }

      const data = await apiRequest(`/api/advertiser/${user.id}/commissions`);

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

  const fetchDiscountCodes = async () => {
    if (!user || userRole !== "advertiser") return;

    try {
      console.log("Fetching discount codes for user:", user.id);

      const data = await apiRequest(
        `/api/advertiser/${user.id}/discount-codes`
      );
      console.log("Raw discount codes response:", data);

      if (!Array.isArray(data)) {
        console.log("Invalid discount codes format:", data);
        setDiscountCodes([]);
        return;
      }

      const transformedCodes = data.map((code: any) => {
        const maxGuests = code.package?.max_guests || code.max_uses;
        const usagePercentage = maxGuests
          ? (code.current_uses / maxGuests) * 100
          : 0;

        let commissionRate = 0;
        let tier = t("commission.noCommission");

        if (usagePercentage > 50 && usagePercentage < 75) {
          commissionRate = 3;
          tier = "Bronze (3%)";
        } else if (usagePercentage >= 75 && usagePercentage < 100) {
          commissionRate = 5;
          tier = "Silver (5%)";
        } else if (usagePercentage >= 100) {
          commissionRate = 10;
          tier = "Gold (10%)";
        }

        return {
          ...code,
          usage_percentage: usagePercentage,
          commission_rate: commissionRate,
          tier: tier,
          package_name: code.package?.title || t("common.packageNotFound"),
          package_id: code.package_id,
        };
      });

      console.log("Transformed discount codes:", transformedCodes);
      setDiscountCodes(transformedCodes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      setDiscountCodes([]);
    }
  };

  const fetchDiscountCommissions = async () => {
    if (!user || userRole !== "advertiser") return;

    try {
      console.log(
        "Fetching discount commissions for:",
        user.id,
        discountSelectedMonth,
        discountSelectedYear
      );

      const bookingsData = await apiRequest(`/api/bookings`);
      const bookingsArray = Array.isArray(bookingsData)
        ? bookingsData
        : bookingsData?.bookings || [];

      const discountCodesData = await apiRequest(
        `/api/advertiser/${user.id}/discount-codes`
      );
      const advertiserDiscountCodes = Array.isArray(discountCodesData)
        ? discountCodesData
        : [];

      const confirmedBookings = bookingsArray.filter((booking: any) => {
        const bookingDate = new Date(booking.created_at);
        return (
          booking.status === "confirmed" &&
          bookingDate.getMonth() + 1 === discountSelectedMonth &&
          bookingDate.getFullYear() === discountSelectedYear &&
          booking.discount_code_id
        );
      });

      const packageRevenue: {
        [key: string]: {
          package_id: string;
          package_name: string;
          total_revenue: number;
          discount_code_id: string;
          discount_code: string;
          usage_percentage: number;
          commission_rate: number;
          commission_amount: number;
        };
      } = {};

      confirmedBookings.forEach((booking: any) => {
        const discountCode = advertiserDiscountCodes.find(
          (dc: any) => dc.id === booking.discount_code_id
        );
        if (!discountCode) return;

        const packageId = booking.package_id;

        if (!packageRevenue[packageId]) {
          const maxGuests =
            discountCode.package?.max_guests || discountCode.max_uses;
          const usagePercentage = maxGuests
            ? (discountCode.current_uses / maxGuests) * 100
            : 0;

          let commissionRate = 0;
          if (usagePercentage > 50 && usagePercentage < 75) {
            commissionRate = 3;
          } else if (usagePercentage >= 75 && usagePercentage < 100) {
            commissionRate = 5;
          } else if (usagePercentage >= 100) {
            commissionRate = 10;
          }

          packageRevenue[packageId] = {
            package_id: packageId,
            package_name:
              discountCode.package?.title ||
              discountCode.package_name ||
              t("common.packageNotFound"),
            total_revenue: 0,
            discount_code_id: discountCode.id,
            discount_code: discountCode.code,
            usage_percentage: usagePercentage,
            commission_rate: commissionRate,
            commission_amount: 0,
          };
        }

        packageRevenue[packageId].total_revenue += booking.final_amount || 0;
      });

      Object.values(packageRevenue).forEach((pkg) => {
        pkg.commission_amount = (pkg.total_revenue * pkg.commission_rate) / 100;
      });

      console.log("Calculated package revenues:", packageRevenue);
      setDiscountCommissions(Object.values(packageRevenue) as any);
    } catch (error) {
      console.error("Error fetching discount commissions:", error);
      setDiscountCommissions([]);
    }
  };

  const fetchUpcomingTrips = async () => {
    if (!user || userRole !== "advertiser") {
      setUpcomingTrips([]);
      return;
    }
    try {
      // Fetch packages for the current advertiser
      const packagesData = await apiRequest(
        `/api/advertiser/${user.id}/packages`
      );
      const packagesArray = Array.isArray(packagesData)
        ? packagesData
        : packagesData?.packages || [];

      // Filter packages with available_from within next 14 days
      const now = new Date();
      const in14Days = new Date(now);
      in14Days.setDate(now.getDate() + 14);

      const upcomingPackages = packagesArray.filter((pkg: any) => {
        if (!pkg.available_from) return false;
        const availableFrom = new Date(pkg.available_from);
        return availableFrom >= now && availableFrom <= in14Days;
      });

      setUpcomingTrips(upcomingPackages);
    } catch (error) {
      console.error("Error fetching upcoming trips:", error);
      setUpcomingTrips([]);
    }
  };

  // For advertiser, upcomingTrips is now a list of packages
  const packageList = upcomingTrips.map((pkg: any) => ({
    title: pkg.title || t("common.notSpecified"),
    location: pkg.location || t("common.notSpecified"),
    package_id: pkg.id,
    available_from: pkg.available_from,
    // bookings: [] // Not used for upcoming trips count
  }));

  const handlePackageClick = async (packageInfo: any) => {
    try {
      const confirmedBookings = await apiRequest(
        `/package/userList/${packageInfo.package_id}`
      );

      setSelectedPackageBookings(confirmedBookings);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== "advertiser" && userRole !== "customer") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end">
      <Navbar />
      <div className="container mx-auto p-6 pt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            {userRole === "customer"
              ? t("dashboard.customer")
              : t("dashboard.advertiser")}
          </h1>
          <p className="text-black/80">
            {userRole === "customer"
              ? t("dashboard.travelData")
              : t("dashboard.overviewStats")}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {userRole === "advertiser" && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.monthlyCommission")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ฿
                  {discountCommissions
                    .reduce(
                      (total: number, commission: any) =>
                        total + (commission.commission_amount || 0),
                      0
                    )
                    .toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.fromDiscountCode")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {discountSelectedMonth}/{discountSelectedYear}
                </div>
              </CardContent>
            </Card>
          )}

          {userRole === "customer" && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.totalBookings")}
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
                {t("dashboard.upcomingTrips")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userRole === "advertiser"
                  ? packageList.length
                  : upcomingTrips.length}
              </div>
              {userRole === "advertiser" && packageList.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {packageList.map((pkg) => (
                    <div key={pkg.package_id}>
                      {pkg.title} ({t("common.availableFrom")}:{" "}
                      {pkg.available_from
                        ? new Date(pkg.available_from).toLocaleDateString(
                            "th-TH"
                          )
                        : t("common.notSpecified")}
                      )
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Trips */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t("dashboard.bookedPackages")}</CardTitle>
            <CardDescription>
              {t("dashboard.clickToViewBookers")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {packageList.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t("dashboard.noBookedPackages")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.packageName")}</TableHead>
                    <TableHead>{t("dashboard.location")}</TableHead>
                    <TableHead>{t("dashboard.bookingCount")}</TableHead>
                    <TableHead>{t("dashboard.totalGuests")}</TableHead>
                    <TableHead>{t("dashboard.actions")}</TableHead>
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
                          {Array.isArray(packageInfo.bookings)
                            ? packageInfo.bookings.filter(
                                (booking: any) => booking.status === "confirmed"
                              ).length
                            : 0}
                          {t("dashboard.bookings")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Array.isArray(packageInfo.bookings)
                          ? packageInfo.bookings
                              .filter(
                                (booking: any) => booking.status === "confirmed"
                              )
                              .reduce(
                                (total: number, booking: any) =>
                                  total + booking.guest_count,
                                0
                              )
                          : 0}{" "}
                        {t("dashboard.people")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePackageClick(packageInfo)}
                        >
                          {t("dashboard.viewBookerList")}
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
                {t("dashboard.bookingList")} {selectedPackageInfo?.title}
              </DialogTitle>
              <DialogDescription>
                {t("dashboard.location")}: {selectedPackageInfo?.location}
              </DialogDescription>
            </DialogHeader>

            {selectedPackageBookings && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border">
                    <p className="text-sm text-blue-600 mb-1">
                      {t("bookingModal.bookingSummary")}
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {
                        selectedPackageBookings.filter(
                          (booking) => booking.status === "confirmed"
                        ).length
                      }
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border">
                    <p className="text-sm text-green-600 mb-1">
                      {t("bookingModal.totalGuests")}
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {selectedPackageBookings
                        .filter((booking) => booking.status === "confirmed")
                        .reduce(
                          (total, booking) => total + booking.guest_count,
                          0
                        )}{" "}
                      {t("common.people")}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg border">
                    <p className="text-sm text-amber-600 mb-1">
                      {t("bookingModal.totalRevenue")}
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      ฿
                      {selectedPackageBookings
                        .filter((booking) => booking.status === "confirmed")
                        .reduce(
                          (total, booking) =>
                            total + (booking.final_amount || 0),
                          0
                        )
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border">
                    <p className="text-sm text-purple-600 mb-1">
                      {t("bookingModal.confirmedBookings")}
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {
                        selectedPackageBookings.filter(
                          (booking) => booking.status === "confirmed"
                        ).length
                      }
                    </p>
                  </div>
                </div>

                {/* Bookings List */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("bookingModal.bookerName")}</TableHead>
                        <TableHead>{t("bookingModal.travelDate")}</TableHead>
                        <TableHead>{t("bookingModal.guestCount")}</TableHead>
                        <TableHead>{t("bookingModal.phoneNumber")}</TableHead>
                        <TableHead>{t("bookingModal.email")}</TableHead>
                        <TableHead>{t("bookingModal.totalAmount")}</TableHead>
                        <TableHead>{t("bookingModal.status")}</TableHead>
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
                          <TableCell>
                            {booking.guest_count} {t("common.people")}
                          </TableCell>
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
                                ? t("bookingModal.confirmed")
                                : booking.status === "pending"
                                ? t("bookingModal.pending")
                                : t("bookingModal.cancelled")}
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
                        <TableHead>{t("discountCodes.code")}</TableHead>
                        <TableHead>{t("discountCodes.package")}</TableHead>
                        <TableHead>{t("discountCodes.discount")}</TableHead>
                        <TableHead>{t("discountCodes.usage")}</TableHead>
                        <TableHead>
                          {t("discountCodes.usagePercentage")}
                        </TableHead>
                        <TableHead>{t("discountCodes.commission")}</TableHead>
                        <TableHead>{t("bookingModal.status")}</TableHead>
                        <TableHead>{t("discountCodes.expiry")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discountCodes.map((discountCode) => (
                        <TableRow key={discountCode.id}>
                          <TableCell className="font-mono font-bold">
                            {discountCode.code}
                          </TableCell>
                          <TableCell>
                            {discountCode.package_name ? (
                              <Button
                                variant="link"
                                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                                onClick={() =>
                                  navigate(
                                    `/packages/${discountCode.package_id}`
                                  )
                                }
                              >
                                {discountCode.package_name}
                              </Button>
                            ) : (
                              <span className="text-gray-400">
                                {t("common.packageNotFound")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountCode.discount_type === "percentage"
                              ? `${discountCode.discount_value}%`
                              : `฿${discountCode.discount_value}`}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {discountCode.current_uses}/
                                {discountCode.package?.max_guests ||
                                  t("common.notSpecified")}
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
                              {discountCode.commission_rate}%
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
                                ? t("discountCodes.active")
                                : t("discountCodes.inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {discountCode.expires_at
                              ? new Date(
                                  discountCode.expires_at
                                ).toLocaleDateString("th-TH")
                              : t("discountCodes.noExpiry")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Discount Commission Month/Year Selector */}
            <Card className="mt-6 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>
                  เลือกเดือน/ปี สำหรับค่าคอมมิชชั่นจากโค้ดส่วนลด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label>เดือน</Label>
                    <Select
                      value={discountSelectedMonth.toString()}
                      onValueChange={(value) =>
                        setDiscountSelectedMonth(parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">มกราคม</SelectItem>
                        <SelectItem value="2">กุมภาพันธ์</SelectItem>
                        <SelectItem value="3">มีนาคม</SelectItem>
                        <SelectItem value="4">เมษายน</SelectItem>
                        <SelectItem value="5">พฤษภาคม</SelectItem>
                        <SelectItem value="6">มิถุนายน</SelectItem>
                        <SelectItem value="7">กรกฎาคม</SelectItem>
                        <SelectItem value="8">สิงหาคม</SelectItem>
                        <SelectItem value="9">กันยายน</SelectItem>
                        <SelectItem value="10">ตุลาคม</SelectItem>
                        <SelectItem value="11">พฤศจิกายน</SelectItem>
                        <SelectItem value="12">ธันวาคม</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ปี</Label>
                    <Select
                      value={discountSelectedYear.toString()}
                      onValueChange={(value) =>
                        setDiscountSelectedYear(parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(
                          (year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardHeader>
                <CardTitle>{t("commission.fromDiscountCodes")}</CardTitle>
                <CardDescription>
                  {t("common.month")} {discountSelectedMonth}/
                  {discountSelectedYear} -
                  {t("commission.listFromDiscountCodes")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discountCommissions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("commission.noCommissionData")}
                  </p>
                ) : (
                  <>
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border">
                      <p className="text-sm text-green-600 mb-1">
                        รวมค่าคอมมิชชั่นในเดือนนี้
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        ฿
                        {discountCommissions
                          .reduce(
                            (total: number, commission: any) =>
                              total + (commission.commission_amount || 0),
                            0
                          )
                          .toLocaleString()}
                      </p>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ชื่อแพ็กเกจ</TableHead>
                          <TableHead>โค้ดส่วนลด</TableHead>
                          <TableHead>Usage Rate</TableHead>
                          <TableHead>รายได้รวม</TableHead>
                          <TableHead>อัตราคอมมิชชั่น</TableHead>
                          <TableHead>จำนวนเงิน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discountCommissions.map(
                          (commission: any, index: number) => (
                            <TableRow key={commission.package_id || index}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {commission.package_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {commission.package_id}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono font-bold text-blue-600">
                                  {commission.discount_code}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {commission.usage_percentage?.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        commission.usage_percentage >= 100
                                          ? "bg-green-600"
                                          : commission.usage_percentage >= 75
                                          ? "bg-blue-600"
                                          : commission.usage_percentage > 50
                                          ? "bg-yellow-600"
                                          : "bg-gray-400"
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          commission.usage_percentage || 0,
                                          100
                                        )}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                ฿
                                {commission.total_revenue?.toLocaleString() ||
                                  0}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    commission.commission_rate >= 10
                                      ? "default"
                                      : commission.commission_rate >= 5
                                      ? "secondary"
                                      : commission.commission_rate >= 3
                                      ? "outline"
                                      : "destructive"
                                  }
                                >
                                  {commission.commission_rate}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold text-green-600">
                                  ฿
                                  {commission.commission_amount?.toLocaleString() ||
                                    0}
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </>
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
