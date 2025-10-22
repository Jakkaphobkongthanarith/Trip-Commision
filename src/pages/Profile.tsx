import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { profileAPI, bookingAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, MapPin, CreditCard, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile {
  display_name?: string;
  phone?: string;
  address?: string;
}

interface Booking {
  id: string;
  booking_date: string;
  guest_count: number;
  total_amount: number;
  final_amount: number;
  status: string;
  payment_status: string;
  expires_at?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  travel_packages: {
    title: string;
    location: string;
    image_url?: string;
  };
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Early return ถ้าไม่มี user (ต้องอยู่ก่อน useState และ useEffect)
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t("profile.loginRequired")}
            </h2>
            <Button onClick={() => navigate("/auth")}>{t("nav.login")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [profile, setProfile] = useState<Profile>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer สำหรับอัปเดตเวลาที่เหลือ
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBookings();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const data = await profileAPI.getByUserId(user?.id);
      console.log("Profile data:", data);
      setProfile({
        display_name: data.display_name || "",
        phone: data.phone || "",
        address: data.address || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      // ถ้าไม่มีข้อมูล profile ยังไม่ต้องแสดง error
      // เพราะอาจเป็นครั้งแรกที่ user เข้าใช้งาน
    }
  };

  const fetchBookings = async () => {
    try {
      // เรียกใช้ Backend API แทน Supabase โดยตรง
      const response = await bookingAPI.getAll();
      console.log("All bookings response:", response);

      // กรองเฉพาะ bookings ของ user ปัจจุบัน
      const userBookings = (response.bookings || []).filter(
        (booking: any) => booking.customer_id === user?.id
      );

      console.log("Filtered user bookings:", userBookings);
      console.log("Current user ID:", user?.id);

      // เรียงลำดับตาม booking_date (ใหม่ที่สุดก่อน)
      const sortedBookings = userBookings.sort(
        (a: any, b: any) =>
          new Date(b.booking_date).getTime() -
          new Date(a.booking_date).getTime()
      );

      setBookings(sortedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await profileAPI.update(user.id, {
        display_name: profile.display_name,
        phone: profile.phone,
        address: profile.address,
      });

      toast({
        title: t("profile.saveSuccess"),
        description: t("profile.saveSuccessDesc"),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t("profile.saveError"),
        description: t("profile.saveErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string, paymentStatus: string) => {
    if (paymentStatus === "completed") return "bg-green-100 text-green-800";
    if (paymentStatus === "pending") return "bg-yellow-100 text-yellow-800";
    if (paymentStatus === "failed" || status === "cancelled")
      return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string, paymentStatus: string) => {
    if (paymentStatus === "completed") return t("profile.status.paid");
    if (paymentStatus === "pending") return t("profile.status.pending");
    if (paymentStatus === "failed" && status === "cancelled")
      return t("profile.status.expired");
    if (paymentStatus === "failed") return t("profile.status.failed");
    if (paymentStatus === "expired") return t("profile.status.expired");
    if (status === "cancelled") return t("profile.status.cancelled");
    return status;
  };

  // ฟังก์ชันตรวจสอบว่าการจองหมดเวลาแล้วหรือไม่
  const isBookingExpired = (booking: any) => {
    if (!booking.expires_at || booking.payment_status !== "pending")
      return false;
    return new Date(booking.expires_at) < new Date();
  };

  // ฟังก์ชันคำนวณเวลาที่เหลือ
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return t("profile.timeExpired");

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${t("profile.timeRemaining")} ${minutes} ${
        language === "th" ? "นาที" : "min"
      } ${seconds} ${language === "th" ? "วินาที" : "sec"}`;
    } else {
      return `${t("profile.timeRemaining")} ${seconds} ${
        language === "th" ? "วินาที" : "sec"
      }`;
    }
  };

  // ฟังก์ชันสำหรับยืนยันการจอง (ไปหน้าชำระเงิน)
  const handleConfirmBooking = (booking: any) => {
    const params = new URLSearchParams({
      title: booking.travel_packages?.title || "ไม่ระบุแพ็คเกจ",
      guests: booking.guest_count.toString(),
      amount: booking.final_amount.toString(),
      contact_name: booking.contact_name || "",
      contact_phone: booking.contact_phone || "",
      contact_email: booking.contact_email || "",
    });

    navigate(`/payment/confirm/${booking.id}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-16 h-full">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("profile.backToHome")}
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {t("profile.title")}
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("profile.personalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">{t("profile.email")}</Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("profile.emailNote")}
                </p>
              </div>

              <div>
                <Label htmlFor="displayName">{t("profile.displayName")}</Label>
                <Input
                  id="displayName"
                  value={profile.display_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, display_name: e.target.value })
                  }
                  placeholder={t("profile.displayNamePlaceholder")}
                />
              </div>

              <div>
                <Label htmlFor="phone">{t("profile.phone")}</Label>
                <Input
                  id="phone"
                  value={profile.phone || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  placeholder={t("profile.phonePlaceholder")}
                />
              </div>

              <div>
                <Label htmlFor="address">{t("profile.address")}</Label>
                <Input
                  id="address"
                  value={profile.address || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                  placeholder={t("profile.addressPlaceholder")}
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full"
              >
                {saving ? t("profile.saving") : t("profile.saveButton")}
              </Button>
            </CardContent>
          </Card>

          {/* Booking History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("profile.bookingHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">
                    {t("profile.loading")}
                  </p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t("profile.noBookings")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/packages")}
                    className="mt-4"
                  >
                    {t("profile.startBooking")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {booking.travel_packages?.title}
                            </h3>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{booking.travel_packages?.location}</span>
                            </div>
                          </div>
                          <Badge
                            className={getStatusColor(
                              booking.status,
                              booking.payment_status
                            )}
                          >
                            {getStatusText(
                              booking.status,
                              booking.payment_status
                            )}
                          </Badge>
                        </div>

                        <Separator className="my-3" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">
                              {t("profile.bookingDate")}
                            </p>
                            <p className="font-medium">
                              {new Date(
                                booking.booking_date
                              ).toLocaleDateString(
                                language === "th" ? "th-TH" : "en-US"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              {t("profile.guests")}
                            </p>
                            <p className="font-medium">
                              {booking.guest_count} {t("profile.guestsUnit")}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              {t("profile.totalPrice")}
                            </p>
                            <p className="font-medium">
                              {t("common.baht")}
                              {booking.total_amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              {t("profile.paymentAmount")}
                            </p>
                            <p className="font-medium flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {t("common.baht")}
                              {booking.final_amount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* แสดงเวลาหมดอายุสำหรับการจองที่รอชำระ */}
                        {booking.payment_status === "pending" &&
                          booking.expires_at && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 text-yellow-800">
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {isBookingExpired(booking)
                                    ? t("profile.timeExpired")
                                    : getTimeRemaining(booking.expires_at)}
                                </span>
                              </div>
                            </div>
                          )}

                        {/* ปุ่มยืนยันการจอง สำหรับ payment_status pending และยังไม่หมดเวลา */}
                        {booking.payment_status === "pending" &&
                          !isBookingExpired(booking) && (
                            <div className="mt-4 pt-3 border-t">
                              <Button
                                onClick={() => handleConfirmBooking(booking)}
                                className="w-full bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {t("profile.confirmBooking")}
                              </Button>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
